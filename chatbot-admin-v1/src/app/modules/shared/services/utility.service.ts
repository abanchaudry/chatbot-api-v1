import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RoutesRecognized } from '@angular/router';
import { filter, pairwise } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class utilityService {
  public UserAuthData: any;
  public userLogData: any;
  public isAuthenticated: boolean = false;
  public userToken: any;
  public currentUrl: string;
  previousUrl;
  public loginUser: any;

  public userDetail = new BehaviorSubject<any>(null);
  userDetail$ = this.userDetail.asObservable();

  public userRole = new BehaviorSubject<'super_admin' | 'client_admin' | null>(null);
  userRole$ = this.userRole.asObservable();

  public activeClientId = new BehaviorSubject<string | null>(null);
  activeClientId$ = this.activeClientId.asObservable();

  public activeClientName = new BehaviorSubject<string | null>(null);
  activeClientName$ = this.activeClientName.asObservable();

  constructor(
    private location: Location,
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUrl = this.router.url;
    this.previousUrl = null;

    // Load active workspace from localStorage if saved
    const savedClientId = localStorage.getItem('__active_client_id');
    const savedClientName = localStorage.getItem('__active_client_name');
    if (savedClientId) {
      this.activeClientId.next(savedClientId);
      this.activeClientName.next(savedClientName || savedClientId);
    }

    // Check token on startup
    const token = localStorage.getItem(environment.token_label);
    if (token) {
      this.getLoggedInUserData(token);
    }

    this.router.events
      .pipe(
        filter((event: any) => event instanceof RoutesRecognized),
        pairwise()
      )
      .subscribe((events: RoutesRecognized[]) => {
        if (events[0].urlAfterRedirects) {
          this.previousUrl = events[0].urlAfterRedirects;
        }
        if (events[1].urlAfterRedirects) {
          this.currentUrl = events[1].urlAfterRedirects;
        }
      });
  }

  public getPreviousUrl() {
    if (this.previousUrl == null) {
      this.router.navigateByUrl('/login');
    } else {
      this.router.navigateByUrl(this.previousUrl);
    }
  }

  goBack() {
    this.location.back();
  }

  getDecodedAccessToken(token: string): any {
    try {
      return jwtDecode(token);
    } catch (Error) {
      return null;
    }
  }

  async getLoggedInUserData(token: string) {
    this.userToken = token;
    this.UserAuthData = await this.getDecodedAccessToken(token);
    if (this.UserAuthData) {
      this.isAuthenticated = true;
      const role = this.UserAuthData.role || 'client_admin';
      this.userRole.next(role);

      if (role === 'client_admin' && this.UserAuthData.clientId) {
        this.setActiveClient(this.UserAuthData.clientId, this.UserAuthData.username);
      }

      this.getUserDetails();
    }
  }

  setActiveClient(clientId: string | null, clientName: string | null = null) {
    this.activeClientId.next(clientId);
    this.activeClientName.next(clientName || clientId);
    if (clientId) {
      localStorage.setItem('__active_client_id', clientId);
      if (clientName) localStorage.setItem('__active_client_name', clientName);
    } else {
      localStorage.removeItem('__active_client_id');
      localStorage.removeItem('__active_client_name');
    }
  }

  getUserDetails(userId: string = this.UserAuthData?.id) {
    if (!userId) return;
    this.authService.getUserById(userId).subscribe((res: any) => {
      const data = res?.user || res?.data;
      if (data) {
        this.userDetail.next(data);
        if (data.role) {
          this.userRole.next(data.role);
        }
      }
    });
  }

  public _userLogged: Subject<any> = new Subject<any>();
  public userLoggedObs = this._userLogged.asObservable();

  logoutUser() {
    this._userLogged.next(false);
    localStorage.removeItem(environment.token_label);
    localStorage.removeItem('__active_client_id');
    localStorage.removeItem('__active_client_name');
    this.UserAuthData = null;
    this.isAuthenticated = false;
    this.userToken = null;
    this.loginUser = null;
    this.userRole.next(null);
    this.activeClientId.next(null);
    this.activeClientName.next(null);
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
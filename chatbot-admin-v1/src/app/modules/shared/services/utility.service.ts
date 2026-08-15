import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RoutesRecognized } from '@angular/router';
import { filter, pairwise } from 'rxjs/operators';
import { jwtDecode }from 'jwt-decode';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';


@Injectable({
    providedIn: 'root'
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



    constructor(
        private location: Location,
        private router: Router,
        private authService: AuthService
    ) {
        this.currentUrl = this.router.url;
        this.previousUrl = null;

        this.router.events
            .pipe(filter((event: any) => event instanceof RoutesRecognized), pairwise())
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
            this.router.navigateByUrl('/login')
        } else {
            this.router.navigateByUrl(this.previousUrl)
        }
    }

    goBack() {
        this.location.back();
    }


    getDecodedAccessToken(token: string): any {
        try {
            return jwtDecode(token);
        }
        catch (Error) {
            return null;
        }
    }

    async getLoggedInUserData(token){
        this.userToken = token;
        this.UserAuthData = await this.getDecodedAccessToken(token);
        console.log('user auth data' , this.UserAuthData);
        this.isAuthenticated = true;
        this.getUserDetails()
    }

    getUserDetails(userId: string = this.UserAuthData?.id){
        this.authService.getUserById(userId).subscribe(res => {
            this.userDetail.next(res.data);
        })
    }

    public _userLogged: Subject<any> = new Subject<any>(); 
    public userLoggedObs = this._userLogged.asObservable();
    logoutUser() {
        this._userLogged.next(false);
        localStorage.removeItem(environment.token_label)
        this.UserAuthData = null;
        this.isAuthenticated = false;
        this.userToken = null;
        this.loginUser = null;
        this.router.navigate(['/login'], { replaceUrl: true });
    }


}
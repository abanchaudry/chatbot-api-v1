import { Component, HostListener, OnInit } from "@angular/core";
import { Router, NavigationEnd, NavigationStart } from "@angular/router";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { HttpErrorInterceptor } from "./modules/shared/interceptors/error-interceptor";
import { environment } from "src/environments/environment";
import { utilityService } from "./modules/shared/services/utility.service";
import { InactivityService } from "./modules/shared/services/inactivity.service";
import { Title } from '@angular/platform-browser';
@Component({
  selector: "app-my-app",
  templateUrl: "./app.component.html",
  // providers:[HttpErrorInterceptor]
})
export class AppComponent implements OnInit {
  private _router: Subscription;

  constructor(
    private router: Router,
    private title: Title,
    private utility: utilityService,
    private inactivityService: InactivityService
  ) {}

  ngOnInit() {
 this.title.setTitle(environment.appName);

    this.inactivityService.startTimer();

    this._router = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const body = document.getElementsByTagName("body")[0];
        const modalBackdrop =
          document.getElementsByClassName("modal-backdrop")[0];
        if (body.classList.contains("modal-open")) {
          body.classList.remove("modal-open");
          modalBackdrop.remove();
        }
      });

    const token = localStorage.getItem(environment.token_label);
    if (token) {
      this.utility.getLoggedInUserData(token);
    }
  }
  @HostListener("window:mousemove")
  @HostListener("window:click")
  @HostListener("window:keypress")
  @HostListener("window:scroll")
  resetTimer() {
    this.inactivityService.resetTimer();
  }
}

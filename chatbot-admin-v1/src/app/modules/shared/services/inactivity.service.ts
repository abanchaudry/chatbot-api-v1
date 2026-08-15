// inactivity.service.ts
import { Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class InactivityService {
  private inactivityTimer$ = new Subject<void>();
private readonly INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000;

  private timer: any;

  constructor(private router: Router, private ngZone: NgZone) {
    this.inactivityTimer$.subscribe(() => {
      this.logout();
    });
  }

  startTimer() {
    this.ngZone.runOutsideAngular(() => {
      this.timer = setTimeout(() => {
        this.ngZone.run(() => {
          this.inactivityTimer$.next();
        });
      }, this.INACTIVITY_TIMEOUT);
    });
  }

  resetTimer() {
    clearTimeout(this.timer);
    this.startTimer();
  }

  private logout() {
    console.log("User is inactive. Logging out...");
    localStorage.removeItem("authToken  ");
    this.router.navigate(["/login"]);
  }
}

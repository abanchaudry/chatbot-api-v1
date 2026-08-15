import { Component, OnInit, ElementRef, OnDestroy } from "@angular/core";
import { User } from "../models/user";
import { Router } from "@angular/router";
import { AuthService } from "../../shared/services/auth.service";
import { environment } from "src/environments/environment";
import { utilityService } from "../../shared/services/utility.service";
declare var $: any;

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit {
  user = new User();
  showPassword: boolean = false;
  appName = environment.appName || "Chatbot Admin"

  constructor(
    private authService: AuthService,
    private router: Router,
    private utility: utilityService
    ) { }

  ngOnInit() {

  }


  onSubmit() {
    this.authService.loginUser(this.user).subscribe((res) => {      
      let { token } = res;
      if (token) {
        localStorage.setItem(environment.token_label, token);
        this.utility.getLoggedInUserData(token);
        this.router.navigateByUrl("/dashboard");
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}

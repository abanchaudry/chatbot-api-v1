import { Component, OnInit } from "@angular/core";
import PerfectScrollbar from "perfect-scrollbar";
import { utilityService } from "../../services/utility.service";
import { environment } from "src/environments/environment";

declare const $: any;

//Metadata
export interface RouteInfo {
  path: string;
  title: string;
  type: string;
  icontype: string;
  collapse?: string;
  children?: ChildrenItems[];
}

export interface ChildrenItems {
  path: string;
  title: string;
  ab: string;
  type?: string;
}

//Menu Items
export const ROUTES: RouteInfo[] = [
  {
    path: "/dashboard",
    title: "Dashboard",
    type: "link",
    icontype: "space_dashboard",
  },
  {
    path: "/dashboard/assistant-information",
    title: "Business & AI Persona",
    type: "link",
    icontype: "tune",
  },
  {
    path: "/dashboard/ai-knowledge/add-new-knowledge",
    title: "Add AI Knowledge",
    type: "link",
    icontype: "psychology",
  },
  {
    path: "/dashboard/ai-knowledge/all-ai-knowledge",
    title: "AI Knowledge",
    type: "link",
    icontype: "psychology_alt",
  },
  // chunks
  {
    path: "/dashboard/chunks/view-all",
    title: "All Chunks",
    type: "link",
    icontype: "article",
  },
  {
    path: "/dashboard/threads/all-threads",
    title: "Conversations",
    type: "link",
    icontype: "chat",
  },
  {
    path: "/dashboard/chat-analytics",
    title: "Chat Analytics",
    type: "link",
    icontype: "analytics",
  },
  {
    path: "/dashboard/fallback-analytics",
    title: "Fallback Intelligence",
    type: "link",
    icontype: "radar",
  },
  // {
  //   path: "/dashboard/profile-setting",
  //   title: "Setting",
  //   type: "link",
  //   icontype: "settings",
  // },

];
@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit {
  public menuItems: any[];
  ps: any;
  appName = environment.appName || "Chatbot Admin"
  
  isMobileMenu() {
    if ($(window).width() > 991) {
      return false;
    }
    return true;
  }

  constructor(private utility: utilityService) { }

  user;
  ngOnInit() {
    this.utility.userDetail.subscribe((res) => {
      this.user = res;
    });
    this.menuItems = ROUTES.filter((menuItem) => menuItem);
    if (window.matchMedia(`(min-width: 960px)`).matches && !this.isMac()) {
      const elemSidebar = <HTMLElement>(
        document.querySelector(".sidebar .sidebar-wrapper")
      );
      this.ps = new PerfectScrollbar(elemSidebar);
    }
  }
  updatePS(): void {
    if (window.matchMedia(`(min-width: 960px)`).matches && !this.isMac()) {
      this.ps.update();
    }
  }
  isMac(): boolean {
    let bool = false;
    if (
      navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
      navigator.platform.toUpperCase().indexOf("IPAD") >= 0
    ) {
      bool = true;
    }
    return bool;
  }
  expandOrCollapseMenu(id) {
    let parent = document.getElementById(id + "-p");
    let child = document.getElementById(id);
    parent.ariaExpanded = parent.ariaExpanded === "true" ? "false" : "true";
    child.style.height =
      child.style.height === "0px" || child.style.height === "" ? "100%" : "0";
  }
}

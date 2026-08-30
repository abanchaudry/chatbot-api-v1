import { Component, OnInit } from "@angular/core";
import PerfectScrollbar from "perfect-scrollbar";
import { utilityService } from "../../services/utility.service";
import { environment } from "src/environments/environment";

declare const $: any;

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

export const SUPER_ADMIN_ROUTES: RouteInfo[] = [
  {
    path: "/dashboard/super-admin/dashboard",
    title: "Businesses & Tenants",
    type: "link",
    icontype: "domain",
  },
  {
    path: "/dashboard/super-admin/add-client",
    title: "Register Business",
    type: "link",
    icontype: "add_business",
  },
];

export const CLIENT_ROUTES: RouteInfo[] = [
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
];

export const ROUTES: RouteInfo[] = [...SUPER_ADMIN_ROUTES, ...CLIENT_ROUTES];

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit {
  public menuItems: any[] = [];
  public superAdminItems: any[] = [];
  ps: any;
  appName = environment.appName || "Chatbot Admin";
  isSuperAdmin: boolean = false;
  activeClientName: string | null = null;
  activeClientId: string | null = null;
  user: any;

  isMobileMenu() {
    if ($(window).width() > 991) {
      return false;
    }
    return true;
  }

  constructor(public utility: utilityService) {}

  ngOnInit() {
    this.utility.userDetail$.subscribe((res) => {
      this.user = res;
    });

    this.utility.userRole$.subscribe((role) => {
      this.isSuperAdmin = role === "super_admin";
      this.buildMenu();
    });

    this.utility.activeClientName$.subscribe((name) => {
      this.activeClientName = name;
    });

    this.utility.activeClientId$.subscribe((id) => {
      this.activeClientId = id;
    });

    this.buildMenu();

    if (window.matchMedia(`(min-width: 960px)`).matches && !this.isMac()) {
      const elemSidebar = <HTMLElement>(
        document.querySelector(".sidebar .sidebar-wrapper")
      );
      if (elemSidebar) {
        this.ps = new PerfectScrollbar(elemSidebar);
      }
    }
  }

  buildMenu() {
    if (this.isSuperAdmin) {
      this.superAdminItems = SUPER_ADMIN_ROUTES;
      this.menuItems = CLIENT_ROUTES;
    } else {
      this.superAdminItems = [];
      this.menuItems = CLIENT_ROUTES;
    }
  }

  resetToAllClients() {
    this.utility.setActiveClient(null, null);
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

  expandOrCollapseMenu(id: string) {
    let parent = document.getElementById(id + "-p");
    let child = document.getElementById(id);
    if (parent && child) {
      parent.ariaExpanded = parent.ariaExpanded === "true" ? "false" : "true";
      child.style.height =
        child.style.height === "0px" || child.style.height === "" ? "100%" : "0";
    }
  }
}

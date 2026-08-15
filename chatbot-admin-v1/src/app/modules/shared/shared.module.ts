import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ComponentsModule } from "./components/components.module";
import { CoreModule } from "../core/core.module";
import { PopupModule } from "./popup/popup.module";
import { SearchFilterPipe } from "./pipes/search-filter.pipe";


const SharedModuleList = [ComponentsModule, CoreModule, PopupModule];

@NgModule({
  declarations: [SearchFilterPipe],
  imports: [CommonModule, ...SharedModuleList],
  exports: [...SharedModuleList, SearchFilterPipe],
})
export class SharedModule {}

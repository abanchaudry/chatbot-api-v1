import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "searchFilter",
})
export class SearchFilterPipe implements PipeTransform {
  transform(value: any[], search: string): any[] {
    if (!value || !search) {
      return value || [];
    }

    const searchTerm = search.toLowerCase().trim();

    const matchesSearch = (obj: any): boolean => {
      if (!obj) return false;

      if (typeof obj === "string" || typeof obj === "number") {
        return obj.toString().toLowerCase().includes(searchTerm);
      }

      if (Array.isArray(obj)) {
        return obj.some((item) => matchesSearch(item));
      }

      if (typeof obj === "object") {
        return Object.values(obj).some((val) => matchesSearch(val));
      }

      return false;
    };

    return value.filter((item) => matchesSearch(item));
  }
}

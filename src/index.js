import { Angular } from "./loader";

export const angular = new Angular();

if (document.readyState === "complete") {
  angular.init(document);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    angular.init(document);
  });
}

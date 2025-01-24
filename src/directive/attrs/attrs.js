import { BOOLEAN_ATTR } from "../../shared/jqlite/jqlite.js";
import { directiveNormalize } from "../../shared/utils";
import { ALIASED_ATTR } from "../../shared/constants";

export const REGEX_STRING_REGEXP = /^\/(.+)\/([a-z]*)$/;

export const ngAttributeAliasDirectives = {};

// boolean attrs are evaluated
Object.entries(BOOLEAN_ATTR).forEach(([attrName, propName]) => {
  // binding to multiple is not supported
  if (propName === "multiple") return;

  function defaultLinkFn(scope, _element, attr) {
    scope.$watch(attr[normalized], (value) => {
      attr.$set(attrName, !!value);
    });
  }

  let normalized = directiveNormalize(`ng-${attrName}`);
  let linkFn = defaultLinkFn;

  if (propName === "checked") {
    linkFn = function (scope, element, attr) {
      // ensuring ngChecked doesn't interfere with ngModel when both are set on the same input
      if (attr.ngModel !== attr[normalized]) {
        defaultLinkFn(scope, element, attr);
      }
    };
  }

  ngAttributeAliasDirectives[normalized] = function () {
    return {
      restrict: "A",
      priority: 100,
      link: linkFn,
    };
  };
});

// aliased input attrs are evaluated
Object.entries(ALIASED_ATTR).forEach(([ngAttr]) => {
  ngAttributeAliasDirectives[ngAttr] = function () {
    return {
      priority: 100,
      link(scope, element, attr) {
        // special case ngPattern when a literal regular expression value
        // is used as the expression (this way we don't have to watch anything).
        if (ngAttr === "ngPattern" && attr.ngPattern.charAt(0) === "/") {
          const match = attr.ngPattern.match(REGEX_STRING_REGEXP);
          if (match) {
            attr.$set("ngPattern", new RegExp(match[1], match[2]));
            return;
          }
        }

        scope.$watch(attr[ngAttr], (value) => {
          attr.$set(ngAttr, value);
        });
      },
    };
  };
});

// ng-src, ng-srcset, ng-href are interpolated
["src", "srcset", "href"].forEach((attrName) => {
  const normalized = directiveNormalize(`ng-${attrName}`);
  ngAttributeAliasDirectives[normalized] = [
    "$sce",
    function ($sce) {
      return {
        priority: 99, // it needs to run after the attributes are interpolated
        link(_scope, element, attr) {
          let name = attrName;

          if (
            attrName === "href" &&
            toString.call(element.href) === "[object SVGAnimatedString]"
          ) {
            name = "xlinkHref";
            attr.$attr[name] = "xlink:href";
          }

          // We need to sanitize the url at least once, in case it is a constant
          // non-interpolated attribute.
          attr.$set(normalized, $sce.getTrustedMediaUrl(attr[normalized]));

          attr.$observe(normalized, (value) => {
            if (!value) {
              if (attrName === "href") {
                attr.$set(name, null);
              }
              return;
            }

            attr.$set(name, value);
          });
        },
      };
    },
  ];
});

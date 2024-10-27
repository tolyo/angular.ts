import {
  assertArgFn,
  assertNotHasOwnProperty,
  minErr,
  isObject,
  isString,
  isFunction,
} from "../../shared/utils";

const $controllerMinErr = minErr("$controller");

const CNTRL_REG = /^(\S+)(\s+as\s+([\w$]+))?$/;
export function identifierForController(controller, ident) {
  if (ident && isString(ident)) return ident;
  if (isString(controller)) {
    const match = CNTRL_REG.exec(controller);
    if (match) return match[3];
  }
}

/**
 * The {@link ng.$controller $controller service} is used by AngularJS to create new
 * controllers.
 *
 * This provider allows controller registration via the
 * {@link ng.$controllerProvider#register register} method.
 */
export class ControllerProvider {
  constructor() {
    /**
     * @type {Map<string, Function|Object>}
     * @private
     */
    this.controllers = new Map();
  }

  /**
   * Check if a controller with a given name exists.
   *
   * @param {string} name Controller name to check.
   * @returns {boolean} True if the controller exists, false otherwise.
   */
  has(name) {
    return this.controllers.has(name);
  }

  /**
   * Register a controller.
   *
   * @param {string|Object} name Controller name, or an object map of controllers where the keys are
   *    the names and the values are the constructors.
   * @param {Function|Array} constructor Controller constructor function (optionally decorated with DI
   *    annotations in the array notation).
   */
  register(name, constructor) {
    assertNotHasOwnProperty(name, "controller");
    if (isObject(name)) {
      Object.entries(name).forEach(([key, value]) => {
        this.controllers.set(key, value);
      });
    } else {
      this.controllers.set(name, constructor);
    }
  }

  /**
   * $get method for dependency injection.
   *
   * @param {import("../../core/di/internal-injector").InjectorService} $injector
   * @returns {Function} A service function that creates controllers.
   */
  $get = [
    "$injector",
    ($injector) => {
      return (expression, locals, later, ident) => {
        let instance;
        let match;
        let constructor;
        let identifier = ident && isString(ident) ? ident : null;
        later = later === true;

        if (isString(expression)) {
          match = expression.match(CNTRL_REG);
          if (!match) {
            throw $controllerMinErr(
              "ctrlfmt",
              "Badly formed controller string '{0}'. Must match `__name__ as __id__` or `__name__`.",
              expression,
            );
          }
          constructor = match[1];
          identifier = identifier || match[3];
          expression = this.controllers.get(constructor);

          if (!expression) {
            throw $controllerMinErr(
              "ctrlreg",
              "The controller with the name '{0}' is not registered.",
              constructor,
            );
          }

          assertArgFn(expression, constructor, true);
        }

        if (later) {
          const controllerPrototype = (
            Array.isArray(expression)
              ? expression[expression.length - 1]
              : expression
          ).prototype;
          instance = Object.create(controllerPrototype || null);

          if (identifier) {
            instance["$controllerIdentifier"] = identifier;
            this.addIdentifier(
              locals,
              identifier,
              instance,
              constructor || expression.name,
            );
          }

          return function () {
            const result = $injector.invoke(
              expression,
              instance,
              locals,
              constructor,
            );

            if (
              result !== instance &&
              (isObject(result) || isFunction(result))
            ) {
              instance = result;
              if (identifier) {
                instance["$controllerIdentifier"] = identifier;
                this.addIdentifier(
                  locals,
                  identifier,
                  instance,
                  constructor || expression.name,
                );
              }
            }

            return instance;
          }.bind(this, { instance, identifier });
        }

        instance = $injector.instantiate(expression, locals, constructor);

        if (identifier) {
          this.addIdentifier(
            locals,
            identifier,
            instance,
            constructor || expression.name,
          );
        }

        return instance;
      };
    },
  ];

  /**
   * Adds an identifier to the controller instance in the given locals' scope.
   *
   * @param {Object} locals The locals object containing the scope.
   * @param {string} identifier The identifier to assign.
   * @param {Object} instance The controller instance.
   * @param {string} name The name of the controller.
   */
  addIdentifier(locals, identifier, instance, name) {
    if (!(locals && isObject(locals.$scope))) {
      throw minErr("$controller")(
        "noscp",
        "Cannot export controller '{0}' as '{1}'! No $scope object provided via `locals`.",
        name,
        identifier,
      );
    }
    locals.$scope[identifier] = instance;
  }
}

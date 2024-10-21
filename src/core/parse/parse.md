// Sandboxing AngularJS Expressions
// ------------------------------
// AngularJS expressions are no longer sandboxed. So it is now even easier to access arbitrary JS code by
// various means such as obtaining a reference to native JS functions like the Function constructor.
//
// As an example, consider the following AngularJS expression:
//
// {}.toString.constructor('alert("evil JS code")')
//
// It is important to realize that if you create an expression from a string that contains user provided
// content then it is possible that your application contains a security vulnerability to an XSS style attack.
//
// See https://docs.angularjs.org/guide/security

/\*\*

- @ngdoc service
- @name $parse
- @kind function
-
- @description
-
- Converts AngularJS {@link guide/expression expression} into a function.
-
- let getter = $parse('user.name');
- let setter = getter.assign;
- let context = {user:{name:'AngularJS'}};
- let locals = {user:{name:'local'}};
-
- expect(getter(context)).toEqual('AngularJS');
- setter(context, 'newValue');
- expect(context.user.name).toEqual('newValue');
- expect(getter(context, locals)).toEqual('local');
-
- @param {string} expression String expression to compile.
- @returns {function(context, locals)} a function which represents the compiled expression:
-
- - `context` – `{object}` – an object against which any expressions embedded in the strings
-      are evaluated against (typically a scope object).
- - `locals` – `{object=}` – local variables context object, useful for overriding values in
-      `context`.
-
- The returned function also has the following properties:
-      * `literal` – `{boolean}` – whether the expression's top-level node is a JavaScript
-        literal.
-      * `constant` – `{boolean}` – whether the expression is made entirely of JavaScript
-        constant literals.
-      * `assign` – `{?function(context, value)}` – if the expression is assignable, this will be
-        set to a function to change its value on the given context.
- @ngdoc provider
- @name $parseProvider
-
-
- @description
- `$parseProvider` can be used for configuring the default behavior of the {@link ng.$parse $parse}
- service.
  \*/

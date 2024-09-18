/\*\*

-
- Implementation Notes for non-IE browsers
- ***
- Assigning a URL to the href property of an anchor DOM node, even one attached to the DOM,
- results both in the normalizing and parsing of the URL. Normalizing means that a relative
- URL will be resolved into an absolute URL in the context of the application document.
- Parsing means that the anchor node's host, hostname, protocol, port, pathname and related
- properties are all populated to reflect the normalized URL. This approach has wide
- compatibility - Safari 1+, Mozilla 1+ etc. See
- http://www.aptana.com/reference/html/api/HTMLAnchorElement.html
-
- Implementation Notes for IE
- ***
- IE <= 10 normalizes the URL when assigned to the anchor node similar to the other
- browsers. However, the parsed components will not be set if the URL assigned did not specify
- them. (e.g. if you assign a.href = "foo", then a.protocol, a.host, etc. will be empty.) We
- work around that by performing the parsing in a 2nd step by taking a previously normalized
- URL (e.g. by assigning to a.href) and assigning it a.href again. This correctly populates the
- properties such as protocol, hostname, port, etc.
-
- References:
- http://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement
- http://www.aptana.com/reference/html/api/HTMLAnchorElement.html
- http://url.spec.whatwg.org/#urlutils
- https://github.com/angular/angular.js/pull/2902
- http://james.padolsey.com/javascript/parsing-urls-with-the-dom/
-
- @kind function
- @param {string|object} url The URL to be parsed. If `url` is not a string, it will be returned
-     unchanged.
- @description Normalizes and parses a URL.
- @returns {object} Returns the normalized URL as a dictionary.
-
- | member name | Description |
- |---------------|------------------------------------------------------------------------|
- | href | A normalized version of the provided URL if it was not an absolute URL |
- | protocol | The protocol without the trailing colon |
- | host | The host and port (if the port is non-default) of the normalizedUrl |
- | search | The search params, minus the question mark |
- | hash | The hash string, minus the hash symbol |
- | hostname | The hostname |
- | port | The port, without ":" |
- | pathname | The pathname, beginning with "/" |
- \*/
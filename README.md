Catalonia weather stations simple rest service (from meteo.cat)
================================================================

Trying different aproaches to get the data from a free service:

*	**Scraperwiki**: useful, but free version only allows one scheduled running/day

*	**Google Apps Script**: with a standalone service you can develop the business logic and the user interface (in this case a simple rest api)

Finally, Google Apps Script was choosen.

API
----

http://tiny.cc/xema

You can set this params:

*	**callback**: to request a JSONP

	http://script.google.com/macros/s/AKfycbz0cyNYyZzQ9thMCAiiTauTtrP58nVymAm8KWx8hhfCZ--yLiA/exec?callback=fn

*	**stations**: list of values separated by comma (it performs a "contains" and with no accents nor diacritics)

	http://script.google.com/macros/s/AKfycbz0cyNYyZzQ9thMCAiiTauTtrP58nVymAm8KWx8hhfCZ--yLiA/exec?callback=fn&stations=alcarras


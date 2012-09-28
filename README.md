Catalonia weather stations simple rest service (from meteo.cat)
================================================================

I've been trying different aproaches:

*	Scraperwiki: useful, but free version only allows one scheduled running/day

*	Google Apps Script: with an standalone service you can develop the business logic and the user interface (in this case a simple rest api)

API
----

http://tiny.cc/xema

You can set this params:

*	callback: to request a JSONP

	http://script.google.com/macros/s/AKfycbz0cyNYyZzQ9thMCAiiTauTtrP58nVymAm8KWx8hhfCZ--yLiA/exec?callback=fn

*	stations: list of values separated by comma (it performs a "contains" and with no accents nor diacritics)

	http://script.google.com/macros/s/AKfycbz0cyNYyZzQ9thMCAiiTauTtrP58nVymAm8KWx8hhfCZ--yLiA/exec?callback=fn&stations=alcarras
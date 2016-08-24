'use strict'

// This should be called once per download
// Each event has a dataChannel that the data will be piped throught
self.onmessage = event => {
    // Create a uniq link for the download
    let uniqLink = 'intercept-me-nr' + Math.random()

    let p = new Promise((resolve, reject) => {
        let stream = createStream(resolve, reject, event.ports[0])
        hijacke(uniqLink, stream, event.data, event.ports[0])
    })

    // Beginning in Chrome 51, event is an ExtendableMessageEvent, which supports
    // the waitUntil() method for extending the lifetime of the event handler
    // until the promise is resolved.
    if ('waitUntil' in event)
        event.waitUntil(p)

    // Without support for waitUntil(), there's a chance that if the promise chain
    // takes "too long" to execute, the service worker might be automatically
    // stopped before it's complete.
}

function createStream(resolve, reject, port){
    // ReadableStream is only supported by chrome 52, but can be enabled

    let bytesWritten = 0
    return new ReadableStream({
		start(controller) {
			port.postMessage({debug: 'ReadableStream has been created'})
			// When we recive data on the messageChannel, we write
			port.onmessage = ({data}) => {
				if (data === 'abort')
					return resolve(),
					controller.error(new Error('Client aborted'))

				if (data === 'end')
                    return resolve(),
					controller.close()

                controller.enqueue(data)
                bytesWritten += data.byteLength
                port.postMessage({ bytesWritten })
			}
		},
		cancel() {
			console.log("user aborted")
		}
	})
}



function hijacke(uniqLink, stream, data, port) {
	let
	listener,

	filename = typeof data === 'string'
		? data
		: data.filename,

	headers = {
		'Content-Type': 'application/octet-stream; charset=utf-8',
		'Content-Disposition': 'attachment; filename=' + filename
	}

	if (data.size)
		headers['Content-Length'] = data.size

    self.addEventListener('fetch', listener = event => {
        if (!event.request.url.includes(uniqLink))
    		return

        port.postMessage({debug: 'Mocking a download request'})

        self.removeEventListener('fetch', listener)

    	let res = new Response(stream, { headers })

    	event.respondWith(res)
    })

	port.postMessage({download: self.registration.scope + uniqLink})
}

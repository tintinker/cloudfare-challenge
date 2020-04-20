addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Error wrapper for url queries
 * @param  {string} url
 * @return {{success:boolean, response:Response, error:Error}}
 * success: true if response status OK,
 * response: response object,
 * error: error object if error occurred, null otherwise
 */
async function query(url) {
  let res = null
  try {
    res = await fetch(url)
    if (!res.ok) {
      throw new Error('Failed to fetch url: ' + url)
    }
    return {
      success: true,
      response: res,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      response: response,
      error: error
    }
  }
}

/**
 * Credit: Cloudfare Cookie Extract Template: https://developers.cloudflare.com/workers/templates/pages/cookie_extract/
 * Grabs the cookie with name from the request headers
 * @param {Request} request incoming Request
 * @param {string} name of the cookie to grab
 */
function getCookie(request, name) {
  let result = null
  let cookieString = request.headers.get('Cookie')
  if (cookieString) {
    let cookies = cookieString.split(';')
    cookies.forEach(cookie => {
      let cookieName = cookie.split('=')[0].trim()
      if (cookieName === name) {
        let cookieVal = cookie.split('=')[1]
        result = cookieVal
      }
    })
  }
  return result
}

/**
 * Chooses which server to route the request to
 * If there is a cookie indicating the previous decision, returns prev decision
 * @param {Request} request 
 * @param {int} numOptions length of variants array
 * @return {int} index of variant to use
 */
function chooseVariant(request, numOptions) {
  cookie = getCookie(request, "variantchoice")
  if(cookie && !isNaN(parseInt(cookie))) {
    return parseInt(cookie)
  } else {
    return Math.floor(Math.random() * numOptions)
  }
}


/**
 * Utility Class for the HTMLRewriter
 * Replaces the inner html (required) and href attr if specified
 */
class InnerHTMLRewriter {
  constructor(innerHTML, linkTarget) {
    this.innerHTML = innerHTML
    this.linkTarget = linkTarget
  }
 
  element(element) {
      element.setInnerContent(this.innerHTML, {html: true})

      if(this.linkTarget) {
        element.setAttribute("href", this.linkTarget)
      }
    }
  }

  /**
 * Utility Class for the HTMLRewriter
 * Replaces the attribute with the given value (val)
 */
class AttributeRewriter {
  constructor(attrbute, val) {
    this.attribute = attrbute
    this.val = val
  }
 
  element(element) {
      element.setAttribute(this.attribute, this.val)
    }
  }

  style="background-image: url('img_girl.jpg');"
/**
 * Customizes response from the given variant
 * @param {int} choice index in the variant array of url chosen to load request
 * @param {String} url url from which to load request
 * @return {Response}
 */
async function rewriteResponse(choice, url) {
  const rewriter = new HTMLRewriter()
  .on('title', new InnerHTMLRewriter('Have a Cookie'))
  .on('h1#title', new InnerHTMLRewriter(`Reason ${choice + 1} to hire me: I was <a style="color:#0000EE;text-decoration: underline;" href="https://www.cloudflare.com/builtforthis/">#Built for this</a> role`))
  .on('p#description', new InnerHTMLRewriter("Thank you for putting the time and energy into reviewing this submission! <br> <br> Please check out my fullstack web app Bandwagon on my website, jtinker.org!"))
  .on('a#url', new InnerHTMLRewriter("Check out Bandwagon"))
  .on('a#url', new AttributeRewriter("href","https://bit.ly/bandwagapp"))
  .on('body', new AttributeRewriter("style", "background-image: url('https://jtinker.org/static/cookiebackground.jpg')"))
  const res = await fetch(url)
  return rewriter.transform(res)
}

/**
 * Route request to one of the servers chosen at random
 * @param {Request} request
 * @return {Response} response of chosen server if successful, generic 500 error if not
 */
async function handleRequest(request) {

  let variantsResponse = await query("https://cfw-takehome.developers.workers.dev/api/variants")
  
  if(!variantsResponse.success) {
    console.log(variantsResponse.error.message)
    return new Response('Internal Error Occurred', {
      headers: { 'content-type': 'text/plain' },
      status: 500
    })
  }

  let data = await variantsResponse.response.json()
  let variants = data["variants"]
  let choice = chooseVariant(request, variants.length)
  
  let response = await rewriteResponse(choice, variants[choice])
  response.headers.set("Set-Cookie", `variantchoice=${choice}`)

  return response
}

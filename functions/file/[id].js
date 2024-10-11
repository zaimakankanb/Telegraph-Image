export async function onRequest(context) {  
    const {   
        request,    
        env,    
        params,    
        waitUntil,    
        next,    
        data 
    } = context;

    const allowedDomains = env.DOMAIN_LIST.split(",");  
    const firstDomain = allowedDomains[0];  

    const Referer = request.headers.get('Referer') || "Referer";
    
    let refererUrl;
    try {
        refererUrl = new URL(Referer);
    } catch (error) {
        return Response.redirect(`https://${firstDomain}`, 302);
    }

    // Check Referer against allowed domains
    if (!allowedDomains.includes(refererUrl.hostname)) {
        return Response.redirect(`https://${firstDomain}`, 302);
    }

    const url = new URL(request.url);

    // Modify headers to bypass restrictions
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set('Referer', 'https://your-allowed-domain.com');  // Set a valid Referer
    
    const response = fetch(url, {
        method: request.method,
        headers: modifiedHeaders,
        body: request.body,
    }).then(async (response) => {
        if (response.ok) {
            const refererAdmin = url.origin + "/admin";
            if (request.headers.get('Referer') === refererAdmin) {
                return response;
            }

            const record = await env.img_url.getWithMetadata(params.id); 
            if (record.metadata) {
                if (record.metadata.ListType === "White") {
                    return response;
                } else if (record.metadata.ListType === "Block" || record.metadata.Label === "adult") {
                    return Response.redirect("https://static-res.pages.dev/teleimage/img-block-compressed.png", 302);
                }
            }

            if (env.WhiteList_Mode === "true") {
                return Response.redirect(url.origin + "/whitelist-on.html", 302);
            }

            const time = new Date().getTime();
            const apikey = env.ModerateContentApiKey;
            if (apikey) {
                const moderateResponse = await fetch(`https://api.moderatecontent.com/moderate/?key=${apikey}&url=https://telegra.ph/${url.pathname}${url.search}`);
                const moderateData = await moderateResponse.json();

                await env.img_url.put(params.id, "", {
                    metadata: { ListType: "None", Label: moderateData.rating_label, TimeStamp: time },
                });

                if (moderateData.rating_label === "adult") {
                    return Response.redirect(url.origin + "/block-img.html", 302);
                }
            }
        }
        return response;
    });

    return response;
}

import { appUrl } from "@/lib/integrations";

export async function GET() {
  const origin = appUrl();
  const js = `(function(){
  var s=document.currentScript;
  var key=s && s.getAttribute("data-widget-key");
  if(!key) return;
  var iframe=document.createElement("iframe");
  iframe.src=${JSON.stringify(origin)}+"/w/"+encodeURIComponent(key);
  iframe.title="Clinic chat";
  iframe.allow="clipboard-write";
  iframe.style.cssText="position:fixed;right:0;bottom:0;width:400px;height:680px;border:0;z-index:2147483646;background:transparent;color-scheme:normal;";
  document.body.appendChild(iframe);
})();`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}

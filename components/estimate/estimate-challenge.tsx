"use client"
import {useEffect,useRef} from "react"
type Turnstile={render:(el:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;remove:(id:string)=>void}
declare global {interface Window {turnstile?:Turnstile}}
export function EstimateChallenge({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}) {
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{let id:string|undefined;let active=true;const render=()=>{if(active&&ref.current&&window.turnstile)id=window.turnstile.render(ref.current,{sitekey:siteKey,action:'website-estimate',callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')})};let script=document.querySelector<HTMLScriptElement>('script[data-estimate-turnstile]');if(window.turnstile)render();else {if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.dataset.estimateTurnstile='true';script.async=true;document.head.appendChild(script)}script.addEventListener('load',render)}return()=>{active=false;script?.removeEventListener('load',render);if(id)window.turnstile?.remove(id)}},[siteKey,onToken])
 return <div><p>Security check</p><div ref={ref}/></div>
  }

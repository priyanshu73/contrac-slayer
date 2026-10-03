"use client"
import {useState,useRef,useEffect} from "react"
import type {Measurements} from "@/lib/types"
import type {AddressData} from "@/lib/types/address"
import {geocodeAddress} from "@/lib/mapbox"
import {estimateRetryDisposition,estimateAnswerUncertain} from "@/lib/estimate-retry"
import {callSummaryToDescription} from "@/lib/call-summary"
import {validateEstimate, validateEstimateFiles, submitWebsiteEstimate, EstimateRequestError, type EstimateFields} from "@/lib/estimate-request"
export type PrefillData = Partial<Omit<EstimateFields,"email">>
export function useEstimateRequest({contractorUuid,prefillData,websiteSlug}:{contractorUuid?:string;prefillData?:PrefillData|null;websiteSlug?:string}) {
 const [formData,setFormData]=useState<EstimateFields>({name:"",email:"",phone:"",address:"",project_type:"",description:""})
 const [hasPrefilled,setHasPrefilled]=useState(false)
 const [measurements,setMeasurements]=useState<Measurements>({items:[]})
 const [uploadedFiles,setUploadedFiles]=useState<File[]>([])
 const [isSubmitting,setIsSubmitting]=useState(false)
 const [isSubmitted,setIsSubmitted]=useState(false)
 const [error,setError]=useState("")
 const [fieldErrors,setFieldErrors]=useState<Partial<Record<keyof EstimateFields,string>>>({})
 const [addressData,setAddressData]=useState<AddressData|null>(null)
 const [honeypot,setHoneypot]=useState("")
 const [challengeGeneration,setChallengeGeneration]=useState(0)
 const [challengeToken,setChallengeToken]=useState("")
 const [locked,setLocked]=useState(false)
 const uncertain=useRef(false);const flight=useRef(false);const requestKey=useRef<string|null>(null);const captured=useRef<null|{data:EstimateFields&{address_data?:AddressData};files:File[];measurements:Measurements;honeypot:string}>(null)
 useEffect(()=>{if(prefillData&&!hasPrefilled){setFormData(prev=>({...prev,name:prefillData.name||prev.name,phone:prefillData.phone||prev.phone,address:prefillData.address||prev.address,project_type:prefillData.project_type||prev.project_type,description:callSummaryToDescription(prefillData.description)||prev.description}));setHasPrefilled(true)}},[prefillData,hasPrefilled])
 function handleFileUpload(e:React.ChangeEvent<HTMLInputElement>){if(e.target.files){const next=[...uploadedFiles,...Array.from(e.target.files)];const fileError=websiteSlug?validateEstimateFiles(next):"";if(fileError)setError(fileError);else {setUploadedFiles(next);setError("")};e.target.value=""}}
 const removeFile=(index:number)=>setUploadedFiles(prev=>prev.filter((_,i)=>i!==index))
 async function handleSubmit(e:React.FormEvent){
  e.preventDefault();if(flight.current||isSubmitted)return
  if(websiteSlug&&!challengeToken){setError("Complete the security check before sending.");return}
  if(websiteSlug&&!captured.current){const errors=validateEstimate(formData);setFieldErrors(errors);const fileError=validateEstimateFiles(uploadedFiles);if(Object.keys(errors).length||fileError){setError(fileError||"Check the highlighted fields.");requestAnimationFrame(()=>document.getElementById(`estimate-${Object.keys(errors)[0]}`)?.focus());return}}
  flight.current=true;setIsSubmitting(true);setError("")
  try {
   if(!captured.current){let resolved=addressData;if(!resolved&&formData.address.trim())resolved=websiteSlug?await geocodeAddress(formData.address).catch(()=>null):await geocodeAddress(formData.address)
    captured.current={data:{...formData,...(resolved?{address_data:resolved}:{})},files:[...uploadedFiles],measurements:structuredClone(measurements),honeypot}
   }
   const frozen=captured.current
   if(websiteSlug){requestKey.current??=crypto.randomUUID();setLocked(true);await submitWebsiteEstimate(websiteSlug,frozen.data,frozen.files,frozen.measurements,requestKey.current,frozen.honeypot,challengeToken)}
   else {const {api}=await import("@/lib/api");await api.submitQuoteRequest(contractorUuid||"",frozen.data,frozen.files,frozen.measurements)}
   setIsSubmitted(true)
   setChallengeToken("")
  }catch(err){setError(err instanceof Error?err.message:"Failed to submit request")
   // Explicit field rejection permits edits. Rate/readiness/security retries keep identity.
   // Response loss, 5xx and processing/uncertain states keep the original payload/key frozen.
   if(!websiteSlug){captured.current=null;setLocked(false)}
   else if(err instanceof EstimateRequestError){
    const disposition=estimateRetryDisposition(err.status,err.code,uncertain.current)
    if(estimateAnswerUncertain(err.status,err.code))uncertain.current=true
    if(disposition==='editable'){captured.current=null;setLocked(false);requestKey.current=null;uncertain.current=false}
    if(err.retryAfter)setError(`${err.message} Try again in ${err.retryAfter} seconds.`)
    if(err.code?.startsWith('challenge')){setChallengeToken('');if(!requestKey.current){captured.current=null;setLocked(false)}}
   }

  }finally {flight.current=false;setIsSubmitting(false);if(websiteSlug){setChallengeToken("");setChallengeGeneration(n=>n+1)}}
 }
 return {formData,setFormData,hasPrefilled,measurements,setMeasurements,uploadedFiles,setUploadedFiles,isSubmitting,isSubmitted,error,setError,addressData,setAddressData,handleFileUpload,removeFile,handleSubmit,fieldErrors,locked,honeypot,setHoneypot,challengeToken,setChallengeToken,challengeGeneration}
}

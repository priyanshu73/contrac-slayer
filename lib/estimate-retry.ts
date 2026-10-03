export type RetryDisposition='editable'|'same-request'|'mismatch'
export function estimateRetryDisposition(status?:number,code?:string,uncertain=false):RetryDisposition {
 if(uncertain&&['challenge_failed','challenge_required','challenge_unavailable','not_ready','rate_limit'].includes(code||''))return 'same-request'
 if(['challenge_failed','challenge_required','challenge_unavailable','not_ready','rate_limit'].includes(code||''))return 'editable'
 if(code==='payload_mismatch')return 'mismatch'
 if(['invalid_fields','body_limit','length_required'].includes(code||'')||[400,413,415,422].includes(status||0)&&!code?.startsWith('challenge'))return 'editable'
 return 'same-request'
}

export function estimateAnswerUncertain(status?:number,code?:string):boolean {return !status||status>=500||code==="in_flight"||code==="retryable_failure"}

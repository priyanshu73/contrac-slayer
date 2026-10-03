import {test} from "node:test"
import assert from "node:assert/strict"
import {testimonialFingerprint,approvedTestimonialIds,moveProofItem} from "../lib/website-proof"
import type {WebsiteContentV2,WebsiteTestimonial} from "../lib/types/website"
const item:WebsiteTestimonial={id:"a",order:0,text:"Exact words",display_name:"Customer",date:null,rating:null,source_label:null,source_permalink:null}
const content={testimonials:[item]} as WebsiteContentV2
test("approval follows exact item, never ID alone",()=>{const grant={a:testimonialFingerprint(item)};assert.deepEqual(approvedTestimonialIds(content,grant),["a"]);for(const changed of [{text:"New"},{display_name:"Other"},{order:1},{rating:5}])assert.deepEqual(approvedTestimonialIds({...content,testimonials:[{...item,...changed}]},grant),[])})
test("no grant, removed ID, new item do not pass",()=>{assert.deepEqual(approvedTestimonialIds(content,{}),[]);assert.deepEqual(approvedTestimonialIds({...content,testimonials:[]},{a:testimonialFingerprint(item)}),[])})
test("ordering immutable and normalizes unique order",()=>{const items=[{id:"a",order:4},{id:"b",order:8}];const next=moveProofItem(items,"b",-1);assert.deepEqual(next,[{id:"b",order:0},{id:"a",order:1}]);assert.deepEqual(items,[{id:"a",order:4},{id:"b",order:8}]);assert.equal(moveProofItem(items,"a",-1),items);assert.equal(moveProofItem(items,"missing",1),items)})
import {appendProofItem,removeProofItem} from "../lib/website-proof"
import {WebsiteMutationLock} from "../lib/website-mutation"
test("order 1000 fixtures add/remove within bounds",()=>{const old=[{id:"a",order:1000}];const next=appendProofItem(old,{id:"b",order:1001});assert.deepEqual(next,[{id:"a",order:0},{id:"b",order:1}]);assert.deepEqual(removeProofItem(next,"a"),[{id:"b",order:0}]);assert.equal(old[0].order,1000)})
test("shared lock blocks all mutations during delayed restore",async()=>{const lock=new WebsiteMutationLock();assert.equal(lock.acquire("restore"),true);await Promise.resolve();for(const mutation of ["save","publish","unpublish","restore"])assert.equal(lock.acquire(mutation),false);lock.release("save");assert.equal(lock.busy,true);lock.release("restore");assert.equal(lock.acquire("save"),true)})

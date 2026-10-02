import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { test } from "node:test"
import React from "react"
import { JSDOM } from "jsdom"

test("crop controls keep changes local until Apply, Cancel does not write, Reset centers", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  const req = createRequire(import.meta.url); req.extensions[".css"] = () => ({})
  const { render, fireEvent, cleanup } = req("@testing-library/react")
  const { NextIntlClientProvider } = req("next-intl")
  const { PhotoCropEditor } = req("../components/websites/photo-crop-editor")
  let applied: unknown = null; let cancels = 0
  const view = render(React.createElement(NextIntlClientProvider, { locale: "en", messages: req("../messages/en.json") }, React.createElement(PhotoCropEditor, { src: "blob:test", title: "Kitchen", crop: { x: .2, y: .3, zoom: 2 }, onApply: (value: unknown) => { applied=value }, onCancel: () => { cancels++ } })))
  try {
    const sliders = view.getAllByRole("slider")
    fireEvent.change(sliders[0], { target: { value: ".8" } })
    assert.equal(applied, null)
    fireEvent.click(view.getByRole("button", { name: "Cancel" }))
    assert.equal(cancels, 1); assert.equal(applied, null)
    fireEvent.click(view.getByRole("button", { name: "Reset framing" }))
    fireEvent.click(view.getByRole("button", { name: "Apply to draft" }))
    assert.deepEqual(applied, { x: .5, y: .5, zoom: 1 })
  } finally { cleanup() }
})

test("photo importer starts rights off and attaches only after website preview confirms", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  const req = createRequire(import.meta.url); req.extensions[".css"] = () => ({})
  const { render, fireEvent, cleanup, act } = req("@testing-library/react")
  const { NextIntlClientProvider } = req("next-intl")
  const { WebsitePhotoImporter } = req("../components/websites/website-photo-importer")
  const { api } = req("../lib/api")
  const original = { getProjectList: api.getProjectList, getWebsiteImportCandidates: api.getWebsiteImportCandidates, getWebsiteImportPreview: api.getWebsiteImportPreview, importWebsitePhoto: api.importWebsitePhoto, getWebsiteAssetPreview: api.getWebsiteAssetPreview }
  let resolvePreview: (v: string) => void = () => {}; let sends = 0; let attached = ""
  api.getProjectList = async () => ({ items: [{ id: 7, title: "Private project" }] })
  api.getWebsiteImportCandidates = async () => ({ items: [{ source_kind: "project_media", source_id: 1, file_name: "work.jpg", bytes: 100, eligible: true, reason: null }, { source_kind: "project_media", source_id: 2, file_name: "legacy.jpg", bytes: 100, eligible: false, reason: "reupload_required" }], next_after_id: null })
  api.getWebsiteImportPreview = async () => "blob:source"
  api.importWebsitePhoto = async (value: { rights_attested: boolean }) => { assert.equal(value.rights_attested, true); sends++; return { asset_id: "website-copy", status: "approved" } }
  api.getWebsiteAssetPreview = async () => new Promise(resolve => { resolvePreview=resolve })
  let view: ReturnType<typeof render>
  try {
    await act(async () => { view=render(React.createElement(NextIntlClientProvider, { locale: "en", messages: req("../messages/en.json") }, React.createElement(WebsitePhotoImporter, { destinationTitle: "Website kitchen", enabled: true, onAttach: (id: string) => { attached=id }, onCancel: () => {} }))) })
    await act(async () => { fireEvent.change(view!.getByLabelText("Source project"), { target: { value: "7" } }) })
    const radios = view!.getAllByRole("radio")
    assert.equal(radios[1].disabled, true)
    fireEvent.click(radios[0]); assert.equal(view!.getByRole("checkbox").checked, false)
    assert.equal(view!.getByRole("button", { name: "Copy 1 photo to draft" }).disabled, true)
    fireEvent.click(view!.getByRole("checkbox"))
    await act(async () => { fireEvent.click(view!.getByRole("button", { name: "Copy 1 photo to draft" })) })
    assert.equal(sends, 1); assert.equal(attached, "")
    await act(async () => { resolvePreview("blob:website") })
    assert.equal(attached, "website-copy")
  } finally { Object.assign(api, original); cleanup() }
})

test("photo importer retries the same accepted copy and respects rights revoked while confirming", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  const req = createRequire(import.meta.url); req.extensions[".css"] = () => ({})
  const { render, fireEvent, cleanup, act } = req("@testing-library/react")
  const { NextIntlClientProvider } = req("next-intl")
  const { WebsitePhotoImporter } = req("../components/websites/website-photo-importer")
  const { api } = req("../lib/api")
  const original = { getProjectList: api.getProjectList, getWebsiteImportCandidates: api.getWebsiteImportCandidates, getWebsiteImportPreview: api.getWebsiteImportPreview, importWebsitePhoto: api.importWebsitePhoto, getWebsiteAssetPreview: api.getWebsiteAssetPreview }
  let sends=0; let previews=0; let attached=0; let finish: (v: string) => void = () => {}
  api.getProjectList = async () => ({ items: [{ id: 7, title: "Private project" }] })
  api.getWebsiteImportCandidates = async () => ({ items: [{ source_kind: "project_media", source_id: 1, file_name: "work.jpg", bytes: 100, eligible: true, reason: null }], next_after_id: null })
  api.getWebsiteImportPreview = async () => "blob:source"
  api.importWebsitePhoto = async () => { sends++; return { asset_id: "copy", status: "approved" } }
  api.getWebsiteAssetPreview = async () => { previews++; if (previews===1) throw new Error("Preview unavailable"); return new Promise(resolve => { finish=resolve }) }
  let view: ReturnType<typeof render>
  try {
    await act(async () => { view=render(React.createElement(NextIntlClientProvider, { locale: "en", messages: req("../messages/en.json") }, React.createElement(WebsitePhotoImporter, { destinationTitle: "Kitchen", enabled: true, onAttach: () => { attached++ }, onCancel: () => {} }))) })
    await act(async () => { fireEvent.change(view!.getByLabelText("Source project"), { target: { value: "7" } }) })
    fireEvent.click(view!.getByRole("radio")); fireEvent.click(view!.getByRole("checkbox"))
    await act(async () => { fireEvent.click(view!.getByRole("button", { name: "Copy 1 photo to draft" })) })
    assert.equal(attached,0); assert.equal(sends,1)
    await act(async () => { fireEvent.click(view!.getByRole("button", { name: "Retry copy" })) })
    assert.equal(sends,1,"preview retry must not copy again")
    fireEvent.click(view!.getByRole("checkbox"))
    await act(async () => { finish("blob:confirmed") })
    assert.equal(attached,0,"revoked rights cannot append accepted asset")
    assert.match(view!.getByRole("status").textContent,/remains private/)
  } finally { Object.assign(api, original); cleanup() }
})

test("gallery capability rejection disables new controls with failure reason", async () => {
  const dom=new JSDOM("<!doctype html><body></body>",{url:"http://localhost"});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement});Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true})
  const req=createRequire(import.meta.url);req.extensions[".css"]=()=>({})
  const {render,cleanup,act}=req("@testing-library/react");const {NextIntlClientProvider}=req("next-intl");const {ProjectGalleryEditor}=req("../components/websites/project-gallery-editor");const {api}=req("../lib/api")
  const old={getWebsiteCapabilities:api.getWebsiteCapabilities,getWebsiteAssetPreview:api.getWebsiteAssetPreview};api.getWebsiteCapabilities=async()=>{throw new Error("offline")};api.getWebsiteAssetPreview=async()=>"blob:asset"
  const content={branding:{hero_asset_id:null},projects:[{id:"p",order:0,title:"Kitchen",service_ids:[],description:"",town:null,approximate_date:null,images:[{id:"i",order:0,asset_id:"a",alt:"Work",caption:"",pair_id:null,pair_role:null}]}]}
  try{let view:any;await act(async()=>{view=render(React.createElement(NextIntlClientProvider,{locale:"en",messages:req("../messages/en.json")},React.createElement(ProjectGalleryEditor,{content,onChange:()=>{},rightsAttested:false,setRightsAttested:()=>{}})))})
  assert.equal(view.getByRole("button",{name:"Frame photo: Work"}).disabled,true)
  assert.equal(view.getByRole("button",{name:"From your projects"}).disabled,true)
  assert.match(view.getByRole("status").textContent,/Couldn't check/)
  }finally{Object.assign(api,old);cleanup()}
})

test("stale candidate response ignored, double click single-flight, unmount revokes source blobs and cannot attach",async()=>{
 const dom=new JSDOM("<!doctype html><body></body>",{url:"http://localhost"});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement});Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true})
 const req=createRequire(import.meta.url);req.extensions[".css"]=()=>({});const {render,fireEvent,cleanup,act}=req("@testing-library/react");const {NextIntlClientProvider}=req("next-intl");const {WebsitePhotoImporter}=req("../components/websites/website-photo-importer");const {api}=req("../lib/api")
 const old={getProjectList:api.getProjectList,getWebsiteImportCandidates:api.getWebsiteImportCandidates,getWebsiteImportPreview:api.getWebsiteImportPreview,importWebsitePhoto:api.importWebsitePhoto,getWebsiteAssetPreview:api.getWebsiteAssetPreview};const revoke=URL.revokeObjectURL;const revoked:string[]=[];URL.revokeObjectURL=(url:string)=>{revoked.push(url)}
 let stale:(v:any)=>void=()=>{},finish:(v:any)=>void=()=>{};let sends=0,attached=0
 api.getProjectList=async()=>({items:[{id:7,title:"Old"},{id:8,title:"New"}]})
 const item=(id:number)=>({source_kind:"project_media",source_id:id,file_name:`photo-${id}.jpg`,bytes:100,eligible:true,reason:null})
 api.getWebsiteImportCandidates=async(project:number)=>project===7?new Promise(r=>{stale=r}):{items:[item(8)],next_after_id:null}
 api.getWebsiteImportPreview=async()=>"blob:source8"
 api.importWebsitePhoto=async()=>{sends++;return new Promise(r=>{finish=r})};api.getWebsiteAssetPreview=async()=>"blob:copy"
 try{let view:any;await act(async()=>{view=render(React.createElement(NextIntlClientProvider,{locale:"en",messages:req("../messages/en.json")},React.createElement(WebsitePhotoImporter,{destinationTitle:"Work",enabled:true,onAttach:()=>attached++,onCancel:()=>{}})))})
 await act(async()=>{fireEvent.change(view.getByLabelText("Source project"),{target:{value:"7"}})})
 await act(async()=>{fireEvent.change(view.getByLabelText("Source project"),{target:{value:"8"}})})
 await act(async()=>{stale({items:[item(7)],next_after_id:null})})
 assert.equal(view.queryByText("photo-7.jpg"),null);assert.ok(view.getByText("photo-8.jpg"))
 fireEvent.click(view.getByRole("radio"));fireEvent.click(view.getByRole("checkbox"))
 await act(async()=>{const b=view.getByRole("button",{name:"Copy 1 photo to draft"});fireEvent.click(b);fireEvent.click(b)})
 assert.equal(sends,1)
 view.unmount();await act(async()=>{finish({asset_id:"copy",status:"approved"})})
 assert.equal(attached,0);assert.ok(revoked.includes("blob:source8"))
 }finally{Object.assign(api,old);URL.revokeObjectURL=revoke;cleanup()}
})

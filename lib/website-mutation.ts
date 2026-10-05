export class WebsiteMutationLock {
  private owner: string | null = null
  acquire(owner:string):boolean { if(this.owner!==null)return false;this.owner=owner;return true }
  release(owner:string):void { if(this.owner===owner)this.owner=null }
  get blocksEditing():boolean {return this.owner==="restore"||this.owner==="unpublish"}
  get busy():boolean { return this.owner!==null }
}

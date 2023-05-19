export interface Org {
  name: string
  members: { collectionId: string, id: string }[]
}

export interface Change {
  id: string
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated'
  desc: string
  tags: string[]
  release: { collectionId: string, id: string }
}
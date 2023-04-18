import { useEffect, useState } from 'react'
import { Box, Container, Divider, Heading, Stack, HStack, Text, Button, Tag, Input, Spacer } from '@chakra-ui/react'
import {
  AutoComplete,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
  AutoCompleteTag,
} from '@choc-ui/chakra-autocomplete'
import { Logo } from './Logo'
import { nanoid } from 'nanoid'
import { usePolybase } from '@polybase/react'
import { CollectionRecord, PolybaseError } from '@polybase/client'
import { useAuth, useIsAuthenticated } from '@polybase/react'

export interface User {
  id: string
}

export interface Org {
  id: string
  name: string
  members: { collectionId: string, id: string }[]
}

export interface Release {
  id: string
  date?: number
}

export interface Change {
  id: string
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated'
  desc: string
  tags: string[]
}


export function Home() {
  const polybase = usePolybase()
  const [user, setUser] = useState<null | CollectionRecord<User>>(null)
  const [org, setOrg] = useState<null | Org>(null)
  // const { data } = useRecord(polybase.collection('Org').record('Polybase'))

  const auth = useAuth()
  const [isLoggedIn] = useIsAuthenticated()

  // Create the user if they don't exist
  useEffect(() => {
    (async () => {
      const publicKey = auth.state?.publicKey
      if (!isLoggedIn || !publicKey || user) return
      const userData = await polybase.collection<User>('User').record(publicKey).get().catch(async (err) => {
        if (err && err instanceof PolybaseError && err.reason === 'record/not-found') {
          return polybase.collection<User>('User').create([])
        }
        throw err
      })
      setUser(polybase.collection('User').record(userData.data.id))
    })()
  }, [auth.state?.publicKey, user, isLoggedIn, polybase])

  // Create the org if it doesn't exist (once user created)
  useEffect(() => {
    if (!isLoggedIn || !user || org) return
    (async () => {
      const org = await polybase.collection<Org>('Org').record('polybase').get().catch(async (err) => {
        if (err && err instanceof PolybaseError && err.reason === 'record/not-found') {
          return polybase.collection<Org>('Org').create(['polybase', 'Polybase', user])
        }
        throw err
      })
      setOrg(org.data)
    })()
  }, [isLoggedIn, org, polybase, user])

  const next: Release = {
    id: 'v0.3.21',
  }

  const releases: Release[] = [{
    id: 'v0.3.20',
    date: Date.now() - 1 * 1000 * 60 * 60 * 24,
  }, {
    id: 'v0.3.19',
    date: Date.now() - 2 * 1000 * 60 * 60 * 24,
  }]

  const isMember = !!org?.members.find((u) => u.id === user?.id)

  return (
    <Container maxW='container.lg' p={4} pb='10em'>
      <Stack spacing={12}>
        <Box py={6}>
          <HStack >
            <Logo to='https://polybase.xyz' external />
            <Heading as='h1' size='lg'>The Changelog</Heading>
            <Spacer />
            <HStack>
              {isMember && (
                <Button
                  onClick={async () => {
                    const publicKey = prompt('Invite user by public key 0x...', '0x')
                    if (!publicKey) return
                    if (!publicKey.startsWith('0x') || publicKey.length !== 130) {
                      alert('Invalid public key')
                      return
                    }
                    await polybase.collection('Org').record('polybase').call('addMember', [polybase.collection('User').record(publicKey)])
                  }}>
                  Invite User
                </Button>
              )}
              <Button onClick={() => {
                isLoggedIn ? auth.auth.signOut() : auth.auth.signIn()
                if (isLoggedIn) {
                  setUser(null)
                  setOrg(null)
                }
              }}>{isLoggedIn ? 'Logout' : 'Login'}</Button>
            </HStack>
          </HStack>
        </Box>
        <Stack spacing='5em'>
          {isMember && (
            <Stack>
              <Heading size='lg'>Pre-release</Heading>
              <Box>
                <Button colorScheme='brand'>
                  Publish {next.id}
                </Button>
              </Box>
              <Box>
                <Stack spacing={6}>
                  <ReleaseItem key={next.id} release={next} edit />
                </Stack>
              </Box>
            </Stack>
          )}
          <Stack>
            <Heading size='lg'>Releases</Heading>
            <Box>
              <Stack spacing={6}>
                {releases.map((release) => (
                  <ReleaseItem key={release.id} release={release} />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Container>
  )
}

const changeTypeColors: Record<Change['type'], string> = {
  added: 'green',
  changed: 'yellow',
  fixed: 'blue',
  removed: 'red',
  deprecated: 'gray',
}

const changeTypes: Change['type'][] = ['added', 'changed', 'fixed', 'removed', 'deprecated']
const tags = [
  'core',
  'explorer',
  'auth',
  'polylang',
  'sdk',
]

export interface ReleaseItemsProps {
  release: Release
  edit?: boolean
}

export function ReleaseItem({ release, edit }: ReleaseItemsProps) {
  const [change, setChange] = useState<Change | null>(null)

  const changes: Change[] = [{
    id: 'v0.3.20',
    type: 'added',
    desc: 'Added a new feature',
    tags: ['feature'],
  }]

  const { id, date } = release


  return (
    <Stack spacing={4}>
      <Stack>
        <Heading as='h2' fontSize='2xl' mt={6}>{id}</Heading>
        {date && <Text color='bw.600'>{new Date(date).toLocaleDateString()}</Text>}
      </Stack>
      <Stack divider={<Divider />}>
        {changes.map((change) => (
          <HStack key={change.id}>
            <Tag colorScheme={changeTypeColors[change.type]}>{change.type}</Tag>
            <Box>
              {change.desc}
            </Box>
            <HStack>
              {change.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </HStack>
          </HStack>
        ))}
      </Stack>
      {edit && !change && (
        <Box>
          <Button size='sm' onClick={() => {
            setChange({
              id: nanoid(),
              type: 'added',
              desc: '',
              tags: [],
            })
          }}>Add</Button>
        </Box>
      )}
      {edit && change && (
        <Stack>
          <HStack>
            <Tag
              colorScheme={changeTypeColors[change.type]}
              cursor='pointer'
              userSelect='none'
              onClick={() => {
                const index = changeTypes.indexOf(change.type)
                const next = changeTypes[(index + 1) % changeTypes.length]
                setChange(() => ({
                  ...change,
                  type: next,
                }))
              }}>{change.type}</Tag>
            <Input size='sm' width='50%' borderRadius='md' py='15px' />
            <Box __css={{
              'ul.chakra-wrap__list': {
                flexWrap: 'nowrap',
              },
            }}>
              <AutoComplete
                openOnFocus
                multiple
                restoreOnBlurIfEmpty={false}
                // value={change.tags}
                onChange={(vals) => {
                  setChange(() => ({
                    ...change,
                    tags: vals,
                  }))
                }}>
                <AutoCompleteInput>
                  {({ tags }) =>
                    tags.map((tag, tid) => (
                      <AutoCompleteTag
                        key={tid}
                        label={tag.label}
                        onRemove={tag.onRemove}
                      />
                    ))
                  }
                </AutoCompleteInput>
                <AutoCompleteList>
                  {tags.map((tag, cid) => (
                    <AutoCompleteItem
                      key={`option-${cid}`}
                      value={tag}
                      _selected={{ bg: 'whiteAlpha.50' }}
                      _focus={{ bg: 'whiteAlpha.100' }}
                    >
                      {tag}
                    </AutoCompleteItem>
                  ))}
                </AutoCompleteList>
              </AutoComplete>
            </Box>
          </HStack >
          <HStack>
            <Button colorScheme='brand' type='submit' size='sm' onClick={() => {
              setChange(null)
            }}>
              Save
            </Button>
            <Button size='sm' onClick={() => {
              setChange(null)
            }}>Cancel</Button>
          </HStack>
        </Stack >
      )
      }
    </Stack >
  )
}


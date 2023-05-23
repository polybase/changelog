import { useEffect, useState } from 'react'
import { Box, Container, Divider, Heading, Stack, HStack, Text, Button, Tag, Input, Spacer, IconButton } from '@chakra-ui/react'
import {
  AutoComplete,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
  AutoCompleteTag,
} from '@choc-ui/chakra-autocomplete'
import { Logo } from './Logo'
import { nanoid } from 'nanoid'
import { useCollection, usePolybase } from '@polybase/react'
import { CollectionRecord, PolybaseError } from '@polybase/client'
import { useAuth, useIsAuthenticated } from '@polybase/react'
import * as semver from 'semver'
import { FaEdit, FaSkull } from 'react-icons/fa'
import axios from 'axios'
import { ColorModeSwitcher } from './util/ColorModeSwitcher'
import { useAsyncCallback } from './util/useAsyncCallback'
import { Loading } from './util/Loading'

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

export interface Commits {
  repo: string
  message: string
  url: string
  sha: string
}

export interface Change {
  id: string
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated'
  desc: string
  tags: string[]
  release?: CollectionRecord<Release>
}


export function Home() {
  const polybase = usePolybase()
  const [user, setUser] = useState<null | CollectionRecord<User>>(null)
  const [org, setOrg] = useState<null | Org>(null)
  const [commits, setCommits] = useState<Commits[]>([])
  const [commitsLoading, setCommitsLoading] = useState<boolean>(true)

  const auth = useAuth()
  const [isLoggedIn] = useIsAuthenticated()

  // Create the user if they don't exist
  useEffect(() => {
    (async () => {
      const publicKey = auth.state?.publicKey
      if (!isLoggedIn || !publicKey || user) return
      let userData = await polybase.collection<User>('User').record(publicKey).get()
      if (!userData.exists()) {
        userData = await polybase.collection<User>('User').create([])
      }
      const userId = userData?.data?.id
      if (!userId) return
      setUser(polybase.collection('User').record(userId))
    })()
  }, [auth.state?.publicKey, user, isLoggedIn, polybase])


  // Create the org if it doesn't exist (once user created
  useEffect(() => {
    if (!isLoggedIn || !user || org) return

    (async () => {
      const org = await polybase.collection<Org>('Org').record('polybase').get()
      setOrg(org.data)
    })()
  }, [isLoggedIn, org, polybase, user])

  const isMember = !!org?.members.find((u) => u.id === user?.id)

  // const releases: Release[] = [{
  //   id: 'v0.3.20',
  //   date: Date.now() - 1 * 1000 * 60 * 60 * 24,
  // }, {
  //   id: 'v0.3.19',
  //   date: Date.now() - 2 * 1000 * 60 * 60 * 24,
  // }]

  const { data: releases, loading: releasesLoading } = useCollection<Release>(
    polybase.collection('Release')
      .where('org', '==', polybase.collection('Org').record('polybase'))
      .where('published', '==', true)
      .sort('date', 'desc'),
  )

  const { data: preReleases } = useCollection<Release>(
    isLoggedIn ? polybase.collection('Release')
      .where('org', '==', polybase.collection('Org').record('polybase'))
      .where('published', '==', false)
      .sort('date', 'desc')
      : null,
  )

  useEffect(() => {
    if (!isMember || !preReleases?.data.length) return
    axios.get('/changelog/api/commits').then((res) => {
      setCommits(res.data)
    })
    setCommitsLoading(false)
  }, [isMember, preReleases?.data.length])

  const lastVersion = preReleases?.data?.[0]?.data.id ?? releases?.data?.[0]?.data.id ?? '0.0.0'

  const createNextRelease = useAsyncCallback(async (type: semver.ReleaseType) => {
    const version = semver.inc(lastVersion, type)
    if (!version) return
    const major = parseInt(version.split('.')[0])
    const minor = parseInt(version.split('.')[1])
    const patch = parseInt(version.split('.')[2])
    await polybase.collection('Release').create([version, major, minor, patch, polybase.collection('Org').record('polybase'), Math.floor(Date.now() / 1000)])
  })

  return (
    <Container maxW='container.lg' p={4} pb='10em'>
      <Stack spacing={12}>
        <Box py={6}>
          <HStack >
            <Logo to='https://polybase.xyz' external />
            <Heading as='h1' size='lg'>The Changelog</Heading>
            <Spacer />
            <HStack>
              <ColorModeSwitcher />
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
                <Stack spacing={6}>
                  {preReleases?.data.map((release) => (
                    <Stack key={release.data.id}>
                      <ReleaseItem editable release={release.data} />
                    </Stack>
                  ))}
                  {preReleases?.data.length === 0 && (
                    <Loading isLoading={createNextRelease.loading}>
                      <HStack mt={3}>
                        <Heading size='sm'>Create Next Release</Heading>
                        <Button onClick={() => createNextRelease.execute('major')}>Major ({semver.inc(lastVersion, 'major')})</Button>
                        <Button onClick={() => createNextRelease.execute('minor')}>Minor ({semver.inc(lastVersion, 'minor')})</Button>
                        <Button onClick={() => createNextRelease.execute('patch')}>Patch ({semver.inc(lastVersion, 'patch')})</Button>
                      </HStack>
                    </Loading>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
          {isMember && preReleases?.data.length && (
            <Stack>
              <Heading size='lg'>Recent commits</Heading>
              <Loading isLoading={commitsLoading}>
                {commits?.length > 0 ? (
                  <Stack spacing={6}>
                    {commits.map((commit) => {
                      return (
                        <HStack spacing={4} key={commit.sha}>
                          <Tag wordBreak='keep-all'>{commit.repo.split('/')[1]}</Tag>
                          <Box>{commit.message}</Box>
                        </HStack>
                      )

                    })}
                  </Stack>
                ) : (
                  <Box>No commits </Box>
                )}
              </Loading>
            </Stack>
          )}
          <Stack>
            <Heading size='lg'>Releases</Heading>
            <Box>
              <Loading isLoading={releasesLoading}>
                <Stack spacing={6}>
                  {releases?.data.map((release) => (
                    <ReleaseItem key={release.data.id} release={release.data} />
                  ))}
                </Stack>
              </Loading>
            </Box>
          </Stack>
        </Stack>
      </Stack >
    </Container >
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
  'polybase-rust',
  'polybase-ts',
  'explorer',
  'docs',
  'auth',
  'polylang',
  'changelog',
  'social',
  'chat',
  'discord-bot',
]

export interface ReleaseItemsProps {
  release: Release
  editable?: boolean
}

export function ReleaseItem({ release, editable }: ReleaseItemsProps) {
  const [change, setChange] = useState<Change | null>(null)
  const polybase = usePolybase()

  // const changes: Change[] = [{
  //   id: 'v0.3.20',
  //   type: 'added',
  //   desc: 'Added a new feature',
  //   tags: ['feature'],
  // }]

  const { data: changes, loading } = useCollection<Change>(
    polybase.collection('Change')
      .where('release', '==', polybase.collection('Release').record(release.id))
      .sort('date', 'desc'),
  )

  const { id, date } = release

  const publishRelease = useAsyncCallback(() => {
    axios.post('/changelog/api/publish', { release: id })
  })

  const finaliseRelease = useAsyncCallback(() => {
    axios.post('/changelog/api/finalise', { release: id })
  })

  return (
    <Stack spacing={4}>
      <Stack>
        <Heading as='h2' fontSize='2xl' mt={6}>{id}</Heading>
        {editable && (
          <HStack>
            <Button colorScheme='brand' onClick={publishRelease.execute} isLoading={publishRelease.loading}>
              Publish {release.id}
            </Button>
            <Button colorScheme='brand' onClick={finaliseRelease.execute} isLoading={finaliseRelease.loading}>
              Finalise {release.id}
            </Button>
          </HStack>
        )}
        {date && <Text color='bw.600'>{new Date(date * 1000).toLocaleDateString()}</Text>}
      </Stack>
      <Loading isLoading={loading}>
        <Stack divider={<Divider />}>
          {changes?.data.map((change) => (
            <ChangeItem key={change.data.id} editable={editable} change={change.data} />
          ))}
        </Stack>
      </Loading>
      {editable && !change && (
        <Box>
          <Button size='sm' onClick={() => {
            setChange({
              id: nanoid(),
              type: 'added',
              desc: '',
              tags: [],
              release: polybase.collection('Release').record(release.id),
            })
          }}>Add</Button>
        </Box>
      )}
      {editable && change && (
        <ChangeItem create editable change={change} onDone={() => {
          setChange(null)
        }} />
      )}
    </Stack >
  )
}

export interface ChangeItemProps {
  editable?: boolean
  create?: boolean
  change: Change
  onDone?: () => void
}

export function ChangeItem({ change: externalChange, create, editable, onDone }: ChangeItemProps) {
  const [change, setChange] = useState<Change>(externalChange)
  const [edit, setEdit] = useState(!!create)
  const polybase = usePolybase()

  useEffect(() => {
    if (edit) return
    setChange(externalChange)
  }, [edit, externalChange])

  const onSave = async () => {
    const { id, type, desc, tags, release } = change
    if (create && release) {
      polybase.collection('Change').create([id, release, type, desc, tags, Math.floor(Date.now() / 1000)])
    } else {
      polybase.collection('Change').record(id).call('update', [type, desc, tags])
    }
  }

  return (
    <Stack>
      <HStack>
        {editable && !create && (
          <Box>
            <IconButton aria-label='edit' size='sm' icon={<FaEdit />} onClick={() => {
              setEdit(true)
            }} />
          </Box>
        )}
        {editable && !create && (
          <Box>
            <IconButton aria-label='edit' size='sm' icon={<FaSkull />} onClick={() => {
              polybase.collection('Change').record(change.id).call('del')
            }} />
          </Box>
        )}
        <Box minW='6em'>
          <Tag
            colorScheme={changeTypeColors[change.type]}
            cursor={edit ? 'pointer' : 'default'}
            userSelect='none'
            onClick={() => {
              if (!edit) return
              const index = changeTypes.indexOf(change.type)
              const next = changeTypes[(index + 1) % changeTypes.length]
              setChange(() => ({
                ...change,
                type: next,
              }))
            }}>{change.type}</Tag>
        </Box>
        {edit ? (
          <Input
            value={change.desc}
            onChange={(e) => {
              setChange(() => ({
                ...change,
                desc: e.target.value,
              }))
            }}
            autoFocus tabIndex={0} size='sm' width='50%' borderRadius='md' py='15px' />
        ) : <Box>{change?.desc}</Box>}
        {edit ? (
          <Box __css={{
            'ul.chakra-wrap__list': {
              flexWrap: 'nowrap',
            },
          }}>
            <AutoComplete
              openOnFocus
              multiple
              restoreOnBlurIfEmpty={false}
              value={change.tags}
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
        ) : (
          <HStack>
            {change.tags.map((tag) => (
              <Tag key={tag} wordBreak='keep-all'>{tag}</Tag>
            ))}
          </HStack>
        )}
      </HStack>
      {edit ? (
        <HStack>
          <Button colorScheme='brand' type='submit' size='sm' onClick={() => {
            setEdit(false)
            onSave()
            if (onDone) onDone()
          }}>
            Save
          </Button>
          <Button size='sm' onClick={() => {
            setEdit(false)
            if (onDone) onDone()
          }}>Cancel</Button>
        </HStack>
      ) : null}
    </Stack>
  )
}
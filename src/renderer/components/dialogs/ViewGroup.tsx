import { DeltaBackend } from '../../delta-remote'
import { C } from 'deltachat-node/dist/constants'
import { Card, Classes, Elevation } from '@blueprintjs/core'
import {
  DeltaDialogBase,
  DeltaDialogHeader,
  DeltaDialogBody,
  DeltaDialogContent,
  DeltaDialogOkCancelFooter,
} from './DeltaDialog'
import { useContactSearch, AddMemberInnerDialog } from './CreateChat'
import { QrCodeShowQrInner } from './QrCode'
import { useContacts, ContactList2 } from '../contact/ContactList'
import {
  PseudoListItemShowQrCode,
  PseudoListItemAddMember,
} from '../helpers/PseudoListItem'
import { DialogProps } from './DialogController'
import { FullChat, JsonContact } from '../../../shared/shared-types'
import { ViewProfileInner } from './ViewProfile'
import { ScreenContext, useTranslationFunction } from '../../contexts'
import { useState, useContext, useEffect } from 'react'
import React from 'react'
import { Avatar, avatarInitial } from '../Avatar'
import { runtime } from '../../runtime'
import { DeltaInput } from '../Login-Styles'
import { isChatDisabled } from '../message/MessageListAndComposer'

export default function ViewGroup(props: {
  isOpen: DialogProps['isOpen']
  onClose: DialogProps['onClose']
  chat: FullChat
}) {
  const { isOpen, onClose, chat } = props
  const [viewMode, setViewMode] = useState('main')

  return (
    <DeltaDialogBase
      isOpen={isOpen}
      onClose={onClose}
      fixed
      style={{
        maxHeight: 'unset',
        height: 'calc(100vh - 50px)',
      }}
    >
      <ViewGroupInner {...{ viewMode, setViewMode, onClose, chat }} />
    </DeltaDialogBase>
  )
}

export const useGroup = (chat: FullChat) => {
  const [groupName, setGroupName] = useState(chat.name)
  const [groupMembers, setGroupMembers] = useState(
    chat.contacts.map(({ id }) => id)
  )
  const [groupImage, setGroupImage] = useState(chat.profileImage)

  useEffect(() => {
    ;(async () => {
      DeltaBackend.call(
        'chat.modifyGroup',
        chat.id,
        groupName,
        groupImage,
        groupMembers
      )
    })()
  }, [groupName, groupImage, groupMembers, chat.id])

  const removeGroupMember = (contactId: number) =>
    setGroupMembers(members => members.filter(mId => mId !== contactId))
  const addGroupMember = (contactId: number) =>
    setGroupMembers(members => [...members, contactId])

  return {
    groupName,
    setGroupName,
    groupMembers,
    setGroupMembers,
    addGroupMember,
    removeGroupMember,
    groupImage,
    setGroupImage,
  }
}

function ViewGroupInner(props: {
  viewMode: string
  setViewMode: (newViewMode: string) => void
  onClose: DialogProps['onClose']
  chat: FullChat
}) {
  const { openDialog } = useContext(ScreenContext)
  const { viewMode, setViewMode, onClose, chat } = props
  const tx = useTranslationFunction()

  const chatDisabled = isChatDisabled(chat)[0]

  const {
    groupName,
    setGroupName,
    groupMembers,
    addGroupMember,
    removeGroupMember,
    groupImage,
    setGroupImage,
  } = useGroup(chat)

  const showRemoveGroupMemberConfirmationDialog = (contact: JsonContact) => {
    openDialog('ConfirmationDialog', {
      message: tx('ask_remove_members', contact.nameAndAddr),
      confirmLabel: tx('delete'),
      cb: (yes: boolean) => {
        if (yes) {
          removeGroupMember(contact.id)
        }
      },
    })
  }

  const showViewGroupDialog = () => {
    openDialog(ViewGroupDialog, {
      groupName,
      groupImage,
      groupColor: chat.color,
      onOk: (groupName: string, groupImage: string) => {
        setGroupName(groupName)
        setGroupImage(groupImage)
      },
    })
  }

  const [qrCode, setQrCode] = useState('')
  const listFlags = chat.isProtected
    ? C.DC_GCL_VERIFIED_ONLY | C.DC_GCL_ADD_SELF
    : C.DC_GCL_ADD_SELF

  const showAddMemberDialog = () => {
    openDialog(AddMemberDialog, {
      listFlags,
      groupMembers,
      onOk: (members: number[]) => members.forEach(addGroupMember),
    })
  }

  const [profileContact, setProfileContact] = useState<JsonContact>(null)

  return (
    <>
      {viewMode === 'showQrCode' && (
        <>
          <DeltaDialogHeader
            title={tx('qrshow_title')}
            showBackButton={true}
            onClickBack={() => setViewMode('main')}
            showCloseButton={true}
            onClose={onClose}
          />
          <QrCodeShowQrInner
            qrCode={qrCode}
            description={tx('qrshow_join_group_hint', [groupName])}
          />
        </>
      )}
      {viewMode === 'main' && (
        <>
          <DeltaDialogHeader
            title={tx('menu_edit_group')}
            onClickEdit={showViewGroupDialog}
            showEditButton={!chatDisabled}
            showCloseButton={true}
            onClose={onClose}
          />
          <div className={Classes.DIALOG_BODY}>
            <Card>
              <div className='group-settings-container'>
                <Avatar
                  displayName={groupName}
                  avatarPath={groupImage}
                  isVerified={chat.isProtected}
                  color={chat.color}
                  large
                />
                <p
                  className='group-name'
                  style={{
                    marginLeft: '17px',
                    width: 'calc(100% - 65px - 17px)',
                    top: '10px',
                    position: 'relative',
                  }}
                >
                  {groupName}
                </p>
              </div>
              <div className='group-seperator'>
                {tx(
                  'n_members',
                  groupMembers.length.toString(),
                  groupMembers.length <= 1 ? 'one' : 'other'
                )}
              </div>
              <div className='group-member-contact-list-wrapper'>
                {!chatDisabled && (
                  <>
                    <PseudoListItemAddMember
                      onClick={() => showAddMemberDialog()}
                    />
                    <PseudoListItemShowQrCode
                      onClick={async () => {
                        const qrCode = await DeltaBackend.call(
                          'chat.getQrCode',
                          chat.id
                        )
                        setQrCode(qrCode)
                        setViewMode('showQrCode')
                      }}
                    />
                  </>
                )}
                <ContactList2
                  contacts={chat.contacts}
                  showRemove
                  onClick={(contact: JsonContact) => {
                    setProfileContact(contact)
                    setViewMode('profile')
                  }}
                  onRemoveClick={showRemoveGroupMemberConfirmationDialog}
                />
              </div>
            </Card>
          </div>
        </>
      )}
      {viewMode === 'profile' && (
        <>
          <DeltaDialogHeader
            title={tx('menu_view_profile')}
            showBackButton={true}
            onClickBack={() => setViewMode('main')}
            showCloseButton={true}
            onClose={onClose}
          />
          <DeltaDialogBody noFooter>
            <DeltaDialogContent noPadding>
              <ViewProfileInner contact={profileContact} onClose={onClose} />
            </DeltaDialogContent>
          </DeltaDialogBody>
        </>
      )}
    </>
  )
}

export function AddMemberDialog({
  onClose,
  isOpen,
  listFlags,
  groupMembers,
  onOk,
}: DialogProps) {
  const [searchContacts, updateSearchContacts] = useContacts(listFlags, '')
  const [queryStr, onSearchChange] = useContactSearch(updateSearchContacts)
  return (
    <DeltaDialogBase
      onClose={onClose}
      isOpen={isOpen}
      canOutsideClickClose={false}
      style={{
        top: '15vh',
        width: '500px',
        maxHeight: '70vh',
      }}
      fixed
    >
      {AddMemberInnerDialog({
        onOk: addMembers => {
          onOk(addMembers)
          onClose()
        },
        onCancel: () => {
          onClose()
        },
        onSearchChange,
        queryStr,
        searchContacts,
        groupMembers,
      })}
    </DeltaDialogBase>
  )
}

export function ViewGroupDialog({
  onClose,
  onOk,
  onCancel,
  isOpen,
  groupName: initialGroupName,
  groupColor,
  groupImage: initialGroupImage,
}: DialogProps) {
  const [groupName, setGroupName] = useState(initialGroupName)
  const [groupImage, setGroupImage] = useState(initialGroupImage)
  const tx = useTranslationFunction()

  const onClickCancel = () => {
    onClose()
    onCancel && onCancel()
  }
  const onClickOk = () => {
    onClose()
    onOk(groupName, groupImage)
  }
  return (
    <DeltaDialogBase
      onClose={onClose}
      isOpen={isOpen}
      canOutsideClickClose={false}
      style={{
        top: '15vh',
        width: '500px',
        maxHeight: '70vh',
        height: 'auto',
      }}
      fixed
    >
      <DeltaDialogHeader title={tx('menu_group_name_and_image')} />
      <DeltaDialogBody>
        <Card elevation={Elevation.ONE}>
          <div
            className='profile-image-username center'
            style={{ marginBottom: '30px' }}
          >
            <GroupImageSelector
              groupName={groupName}
              groupColor={groupColor}
              groupImage={groupImage}
              setGroupImage={setGroupImage}
            />
          </div>
          <DeltaInput
            key='groupname'
            id='groupname'
            placeholder={tx('group_name')}
            value={groupName}
            onChange={(
              event: React.FormEvent<HTMLElement> &
                React.ChangeEvent<HTMLInputElement>
            ) => {
              setGroupName(event.target.value)
            }}
          />
          {groupName === '' && (
            <p
              style={{
                color: 'var(--colorDanger)',
                marginLeft: '80px',
                position: 'relative',
                top: '-30px',
                marginBottom: '-18px',
              }}
            >
              {tx('group_please_enter_group_name')}
            </p>
          )}
        </Card>
      </DeltaDialogBody>
      <DeltaDialogOkCancelFooter onCancel={onClickCancel} onOk={onClickOk} />
    </DeltaDialogBase>
  )
}

export function GroupImageSelector({
  groupName,
  groupColor,
  groupImage,
  setGroupImage,
}: {
  groupName: string
  groupColor: string
  groupImage: string
  setGroupImage: (groupImage: string) => void
}) {
  const tx = window.static_translate

  const onClickSelectGroupImage = async () => {
    const file = await runtime.showOpenFileDialog({
      title: tx('select_your_new_profile_image'),
      filters: [{ name: tx('images'), extensions: ['jpg', 'png', 'gif'] }],
      properties: ['openFile'],
      defaultPath: runtime.getAppPath('pictures'),
    })
    if (file) setGroupImage(file)
  }

  const onClickRemoveGroupImage = () => setGroupImage('')

  const initial = avatarInitial(groupName, '')

  return (
    <div className='profile-image-selector'>
      {/* TODO: show anything else when there is no profile image, like the letter avatar */}
      {groupImage ? (
        <img src={'file://' + groupImage} alt={tx('pref_profile_photo')} />
      ) : (
        <span style={{ backgroundColor: groupColor }}>{initial}</span>
      )}
      <>
        <button
          aria-label={tx('change_group_image')}
          onClick={onClickSelectGroupImage}
          className={'delta-button-round'}
        >
          {tx('change_group_image')}
        </button>
        <button
          aria-label={tx('remove_group_image')}
          onClick={onClickRemoveGroupImage}
          className={'delta-button-round'}
          disabled={groupImage === '' || groupImage === null}
        >
          {tx('remove_group_image')}
        </button>
      </>
    </div>
  )
}

import { BackendRemote } from './backend-com'

export function updateDeviceChats(accountId: number) {
  BackendRemote.rpc.addDeviceMessage(
    accountId,
    'changelog-version-1.34.0-version0',
    `What's new in 1.34.0?
    welcome turonchat`
  )

  BackendRemote.rpc.addDeviceMessage(
    accountId,
    'changelog-version-1.34.1-version0',
    `this is Turon chat`
  )
}

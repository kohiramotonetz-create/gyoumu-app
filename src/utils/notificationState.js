export const markNotificationSupportStarted = (notifications, target) => notifications.map(item => {
  const sameQueue = String(item.queueNumber) === String(target.queueNumber)
  const sameUser = String(item.userId) === String(target.userId)
  if (!sameQueue || !sameUser || String(item.status || '').includes('（対応中）')) return item
  return { ...item, status: `${item.status}（対応中）` }
})

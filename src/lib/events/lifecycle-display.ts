/** A terminal server status must not be hidden by stale lifecycle metadata. */
export function displayedEventLifecycle(event:{status:string;lifecycle_status?:string|null}) {
  return ["completed","cancelled","rejected","draft","pending_approval"].includes(event.status)
    ? event.status : event.lifecycle_status || event.status;
}

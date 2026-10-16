import {handleManagedMediaDelete,handleManagedMediaUpload} from "@/lib/server/neon-managed-media-route";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const POST=handleManagedMediaUpload;
export const DELETE=handleManagedMediaDelete;

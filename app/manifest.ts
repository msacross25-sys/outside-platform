import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
 return {
  name:"OUTSiiDE",
  short_name:"OUTSiiDE",
  description:"Come OUTSiiDE — watch, create, talk, and belong.",
  start_url:"/",
  display:"standalone",
  background_color:"#0a0a0a",
  theme_color:"#0a0a0a",
  orientation:"portrait-primary"
 };
}

import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("notice-board", "routes/notice-board.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("oauth/callback", "routes/oauth.callback.tsx"),
  route("ideas/new", "routes/ideas.new.tsx"),
  route("ideas/:did/:key", "routes/ideas.detail.tsx"),
] satisfies RouteConfig;

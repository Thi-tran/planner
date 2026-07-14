export { auth as middleware } from './auth';

export const config = {
  matcher: ['/calendar', '/calendar/:path*', '/projects', '/projects/:path*'],
};

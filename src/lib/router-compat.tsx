/**
 * react-router-dom compatibility layer built on TanStack Router.
 *
 * The application code was authored against react-router-dom v6. Instead of
 * rewriting every screen, `react-router-dom` is aliased to this module in
 * vite.config.ts so the familiar API keeps working on top of TanStack Router.
 */
import { forwardRef, useEffect, useMemo, type AnchorHTMLAttributes, type ReactNode } from "react";
import {
  Outlet,
  useLocation as useTanstackLocation,
  useParams as useTanstackParams,
  useRouter,
} from "@tanstack/react-router";

export { Outlet };

type To = string;

function useGo() {
  const router = useRouter();
  return (to: To, options?: { replace?: boolean | undefined }) => {
    void router.navigate({ href: to, replace: options?.replace } as never);
  };
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: To;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state: _state, onClick, children, ...rest },
  ref,
) {
  const go = useGo();
  return (
    <a
      ref={ref}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          rest.target === "_blank"
        ) {
          return;
        }
        event.preventDefault();
        go(to, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

export interface NavLinkProps extends Omit<LinkProps, "className" | "style" | "children"> {
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
  style?: React.CSSProperties | ((props: { isActive: boolean; isPending: boolean }) => React.CSSProperties);
  children?: ReactNode | ((props: { isActive: boolean; isPending: boolean }) => ReactNode);
  end?: boolean;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, className, style, children, end, ...rest },
  ref,
) {
  const { pathname } = useLocation();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const args = { isActive, isPending: false };
  return (
    <Link
      ref={ref}
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={typeof className === "function" ? className(args) : className}
      style={typeof style === "function" ? style(args) : style}
      {...rest}
    >
      {typeof children === "function" ? children(args) : children}
    </Link>
  );
});

export function useNavigate() {
  const router = useRouter();
  return (to: To | number, options?: { replace?: boolean | undefined; state?: unknown }) => {
    if (typeof to === "number") {
      void router.history.go(to);
      return;
    }
    void router.navigate({ href: to, replace: options?.replace } as never);
  };
}

export function useLocation() {
  const location = useTanstackLocation();
  return useMemo(
    () => ({
      pathname: location.pathname,
      search: location.searchStr ?? "",
      hash: location.hash ?? "",
      state: location.state,
      key: location.href,
    }),
    [location],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useTanstackParams({ strict: false }) as T;
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string>) => void] {
  const { search, pathname } = useLocation();
  const go = useGo();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const setSearchParams = (next: URLSearchParams | Record<string, string>) => {
    const usp = next instanceof URLSearchParams ? next : new URLSearchParams(next);
    const qs = usp.toString();
    go(qs ? `${pathname}?${qs}` : pathname);
  };
  return [params, setSearchParams];
}

export function useNavigationType() {
  return "PUSH" as const;
}

export function Navigate({ to, replace = true }: { to: To; replace?: boolean }) {
  const go = useGo();
  useEffect(() => {
    go(to, { replace });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return null;
}

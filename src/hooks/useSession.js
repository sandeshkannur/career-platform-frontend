// src/hooks/useSession.js
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { getToken, setToken, clearToken, routeFromSession } from "../auth";
import { apiGet, apiPost } from "../apiClient";
import { toastSuccess } from "../toast";

let __sessionUserCache = null;
let __meInFlightPromise = null;
let __cachedToken = null;

async function fetchMeDeduped() {
  const token = getToken();

  if (!token) {
    __sessionUserCache = null;
    __meInFlightPromise = null;
    __cachedToken = null;
    return null;
  }

  if (__cachedToken !== token) {
    __sessionUserCache = null;
    __meInFlightPromise = null;
    __cachedToken = token;
  }

  if (__sessionUserCache) return __sessionUserCache;

  if (!__meInFlightPromise) {
    __meInFlightPromise = (async () => {
      const me = await apiGet("/v1/auth/me");
      __sessionUserCache = me;
      return me;
    })().finally(() => {
      __meInFlightPromise = null;
    });
  }

  return __meInFlightPromise;
}

export function useSession() {
  const navigate = useNavigate();
  const _location = useLocation();

  const [sessionUser, setSessionUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  async function bootstrapSession() {
    const token = getToken();

    if (!token) {
      setSessionUser(null);
      setBootstrapping(false);
      return;
    }

    try {
      const me = await fetchMeDeduped();
      setSessionUser(me);

      const currentPath = window.location.pathname;
      const isPublic = currentPath === "/" || currentPath === "/login";

      if (isPublic && me) {
        const target = routeFromSession(me, currentPath);
        if (target && target !== currentPath) {
          navigate(target, { replace: true });
        }
      }
    } catch {
      clearToken();
      __sessionUserCache = null;
      __cachedToken = null;
      setSessionUser(null);
      navigate("/login", { replace: true });
    } finally {
      setBootstrapping(false);
    }
  }

  /**
   * Login flow (supports login(email, password, redirectTo))
   */
  const login = async (arg1, arg2, redirectTo) => {
    let email;
    let password;

    if (typeof arg1 === "string") {
      email = arg1;
      password = arg2;
    } else {
      email = arg1?.email ?? arg1?.username;
      password = arg1?.password;
    }

    if (!email || !password) {
      throw new Error("Email/username and password are required.");
    }

    const data = await apiPost("/v1/auth/login-json", { email, password });
    setToken(data.access_token);

    __sessionUserCache = null;
    __meInFlightPromise = null;
    __cachedToken = getToken();

    const me = await fetchMeDeduped();
    setSessionUser(me);

    sessionStorage.removeItem("__AUTH_REDIRECTING__");

    const target = redirectTo || routeFromSession(me, window.location.pathname);
    navigate(target, { replace: true });
  };

  /**
   * Requests an OTP for the given phone number.
   * Does not change session state — just triggers the backend send.
   * Throws on error (e.g. 404 = no account with this phone, 429 = rate limited)
   * so the caller can surface the message.
   */
  const requestOtp = async (phone) => {
    if (!phone) {
      throw new Error("Phone number is required.");
    }
    return apiPost("/v1/auth/otp/request", { phone_number: phone });
  };

  /**
   * OTP login flow — mirrors login() exactly, just hits /v1/auth/otp/verify
   * instead of /v1/auth/login-json. Token shape and session bootstrap are
   * identical, so everything downstream works unchanged.
   */
  const loginWithOtp = async (phone, otp, redirectTo) => {
    if (!phone || !otp) {
      throw new Error("Phone number and OTP are required.");
    }

    const data = await apiPost("/v1/auth/otp/verify", { phone_number: phone, otp });
    setToken(data.access_token);

    __sessionUserCache = null;
    __meInFlightPromise = null;
    __cachedToken = getToken();

    const me = await fetchMeDeduped();
    setSessionUser(me);

    sessionStorage.removeItem("__AUTH_REDIRECTING__");

    const target = redirectTo || routeFromSession(me, window.location.pathname);
    navigate(target, { replace: true });
  };

  const logout = async () => {
    try {
      await apiPost("/v1/auth/logout", {});
    } catch {
      // ignore
    }

    clearToken();

    __sessionUserCache = null;
    __meInFlightPromise = null;
    __cachedToken = null;

    setSessionUser(null);
    toastSuccess("Logged out");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessionUser,
    bootstrapping,
    login,
    requestOtp,
    loginWithOtp,
    logout,
  };
}

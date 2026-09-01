"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * useLayoutEffect en el navegador y useEffect en el servidor, para medir el
 * DOM antes de pintar sin que React avise durante el render en servidor.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

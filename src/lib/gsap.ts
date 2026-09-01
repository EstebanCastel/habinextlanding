"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Un único punto de registro: importar desde aquí evita registrar el plugin
// varias veces y garantiza que ScrollTrigger existe antes de cualquier trigger.
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };

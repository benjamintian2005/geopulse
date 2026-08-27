"use client";

import { useEffect, useRef, useState } from "react";
import * as topojson from "topojson-client";
import countries110m from "world-atlas/countries-110m.json";
import type { GeoEvent } from "@/lib/types";
import type { GlobeInstance } from "globe.gl";
import type { Topology, GeometryCollection } from "topojson-specification";
import type * as THREE from "three";

const RED = "#ff2d2d";

const countryFeatures = topojson.feature(
  countries110m as unknown as Topology,
  (countries110m as unknown as Topology).objects
    .countries as GeometryCollection,
).features;

function severityColor(severity: number): string {
  if (severity >= 5) return "#ff0000";
  if (severity >= 4) return "#ff3b3b";
  if (severity >= 3) return "#ff6b3b";
  return "#ff9a3b";
}

interface GlobeViewProps {
  events: GeoEvent[];
  onSelect: (event: GeoEvent) => void;
  flyToId?: number | null;
}

export default function GlobeView({
  events,
  onSelect,
  flyToId,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    import("globe.gl").then(({ default: Globe }) => {
      if (disposed) return;

      const globe = new Globe(container, {
        animateIn: true,
      })
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor(RED)
        .atmosphereAltitude(0.18)
        .pointsMerge(false)
        .pointLat((d) => (d as GeoEvent).lat)
        .pointLng((d) => (d as GeoEvent).lon)
        .pointAltitude((d) => {
          const e = d as GeoEvent;
          return 0.015 + e.severity * 0.008;
        })
        .pointRadius((d) => {
          const e = d as GeoEvent;
          return 0.35 + e.severity * 0.12;
        })
        .pointColor((d) => severityColor((d as GeoEvent).severity))
        .pointLabel(
          (d) =>
            `<div style="font-family:monospace;color:#ff5555;background:#0a0000;border:1px solid #ff2d2d;padding:6px 8px;border-radius:2px;max-width:260px">
              <b>${(d as GeoEvent).location}</b><br/>${(d as GeoEvent).summary}
            </div>`,
        )
        .onPointClick((d) => onSelectRef.current(d as GeoEvent))
        .ringsData([])
        .ringLat((d) => (d as GeoEvent).lat)
        .ringLng((d) => (d as GeoEvent).lon)
        .ringColor(() => (t: number) => `rgba(255,45,45,${1 - t})`)
        .ringMaxRadius(4)
        .ringPropagationSpeed(2.2)
        .ringRepeatPeriod(900);

      // three-globe's raw GeoJSON polygon layer (borders only, no h3 hexbinning)
      // isn't in globe.gl's shipped .d.ts, so it's accessed via a permissive cast.
      const globeExt = globe as unknown as {
        polygonsData: (d: unknown[]) => typeof globe;
        polygonCapColor: (fn: () => string) => typeof globe;
        polygonSideColor: (fn: () => string) => typeof globe;
        polygonStrokeColor: (fn: () => string) => typeof globe;
        polygonAltitude: (n: number) => typeof globe;
      };
      globeExt
        .polygonsData(countryFeatures)
        .polygonCapColor(() => "rgba(0,0,0,0)")
        .polygonSideColor(() => "rgba(255,20,20,0.04)")
        .polygonStrokeColor(() => RED)
        .polygonAltitude(0.004);

      globe.pointOfView({ lat: 25, lng: 30, altitude: 2.3 });

      const globeMaterial = globe.globeMaterial() as THREE.MeshPhongMaterial;
      globeMaterial.color = new (globeMaterial.color.constructor as new (
        c: string,
      ) => typeof globeMaterial.color)("#000000");
      globeMaterial.emissive = new (
        globeMaterial.emissive!.constructor as new (
          c: string,
        ) => typeof globeMaterial.emissive
      )("#1a0000");
      globeMaterial.emissiveIntensity = 0.3;
      globeMaterial.shininess = 8;

      const controls = globe.controls() as {
        autoRotate: boolean;
        autoRotateSpeed: number;
        enableDamping: boolean;
      };
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping = true;

      const handleResize = () => {
        globe.width(container.clientWidth).height(container.clientHeight);
      };
      window.addEventListener("resize", handleResize);
      handleResize();

      globeRef.current = globe;
      (
        globeRef.current as unknown as { __cleanup?: () => void }
      ).__cleanup = () => window.removeEventListener("resize", handleResize);
      if (!disposed) setReady(true);
    });

    return () => {
      disposed = true;
      const g = globeRef.current as unknown as {
        __cleanup?: () => void;
      } | null;
      g?.__cleanup?.();
      globeRef.current = null;
      container.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;
    globe.pointsData(events);

    const latest = [...events]
      .sort((a, b) => b.id - a.id)
      .slice(0, 12)
      .filter((e) => e.severity >= 3);
    globe.ringsData(latest);
  }, [events, ready]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready || flyToId == null) return;
    const target = events.find((e) => e.id === flyToId);
    if (!target) return;
    globe.pointOfView({ lat: target.lat, lng: target.lon, altitude: 1.4 }, 1200);
  }, [flyToId, events, ready]);

  return <div ref={containerRef} className="h-full w-full" />;
}

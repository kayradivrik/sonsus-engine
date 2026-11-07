import { useEffect, useState, useRef } from "react";
import { UnifiedGame } from "../types/game";

interface GamepadNavOptions {
  games: UnifiedGame[];
  onSelectGame: (game: UnifiedGame) => void;
  onLaunchGame: (game: UnifiedGame) => void;
  onOpenCommandPalette: () => void;
  onNextStore: () => void;
  onPrevStore: () => void;
  enabled?: boolean;
}

export function useGamepadNav({
  games,
  onSelectGame,
  onLaunchGame,
  onOpenCommandPalette,
  onNextStore,
  onPrevStore,
  enabled = true,
}: GamepadNavOptions) {
  const [controllerName, setControllerName] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const lastButtonTimeRef = useRef<{ [btn: number]: number }>({});

  useEffect(() => {
    const handleConnected = (e: GamepadEvent) => {
      setControllerName(e.gamepad.id || "Bağlı Oyun Kolu");
    };
    const handleDisconnected = () => {
      const remaining = navigator.getGamepads().filter(Boolean);
      if (remaining.length === 0) {
        setControllerName(null);
      }
    };

    window.addEventListener("gamepadconnected", handleConnected);
    window.addEventListener("gamepaddisconnected", handleDisconnected);

    return () => {
      window.removeEventListener("gamepadconnected", handleConnected);
      window.removeEventListener("gamepaddisconnected", handleDisconnected);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let animFrame: number;
    const cooldownMs = 180;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads.find((g) => g && g.connected);

      if (gp) {
        if (!controllerName) {
          setControllerName(gp.id || "Gamepad");
        }

        const now = Date.now();
        const checkCooldown = (btnIndex: number) => {
          const last = lastButtonTimeRef.current[btnIndex] || 0;
          if (now - last > cooldownMs) {
            lastButtonTimeRef.current[btnIndex] = now;
            return true;
          }
          return false;
        };

        // D-Pad veya Sol Analog Çubuk
        const dpadUp = gp.buttons[12]?.pressed || gp.axes[1] < -0.6;
        const dpadDown = gp.buttons[13]?.pressed || gp.axes[1] > 0.6;
        const dpadLeft = gp.buttons[14]?.pressed || gp.axes[0] < -0.6;
        const dpadRight = gp.buttons[15]?.pressed || gp.axes[0] > 0.6;

        // Izgara sütun sayısı tahmini
        const cols = window.innerWidth >= 1920 ? 8 : window.innerWidth >= 1280 ? 6 : 4;

        if (dpadRight && checkCooldown(15)) {
          setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, games.length - 1)));
        } else if (dpadLeft && checkCooldown(14)) {
          setSelectedIndex((prev) => Math.max(0, prev - 1));
        } else if (dpadDown && checkCooldown(13)) {
          setSelectedIndex((prev) => Math.min(prev + cols, Math.max(0, games.length - 1)));
        } else if (dpadUp && checkCooldown(12)) {
          setSelectedIndex((prev) => Math.max(0, prev - cols));
        }

        // A / Cross (Button 0) - Seç / Detayı Aç
        if (gp.buttons[0]?.pressed && checkCooldown(0)) {
          if (games[selectedIndex]) {
            onSelectGame(games[selectedIndex]);
          }
        }

        // X / Square (Button 2) - Doğrudan Başlat
        if (gp.buttons[2]?.pressed && checkCooldown(2)) {
          if (games[selectedIndex]) {
            onLaunchGame(games[selectedIndex]);
          }
        }

        // Y / Triangle (Button 3) - Command Palette (Hızlı Arama)
        if (gp.buttons[3]?.pressed && checkCooldown(3)) {
          onOpenCommandPalette();
        }

        // LB (Button 4) / RB (Button 5) - Mağaza Değiştir
        if (gp.buttons[4]?.pressed && checkCooldown(4)) {
          onPrevStore();
        } else if (gp.buttons[5]?.pressed && checkCooldown(5)) {
          onNextStore();
        }
      }

      animFrame = requestAnimationFrame(pollGamepad);
    };

    animFrame = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animFrame);
  }, [enabled, games, selectedIndex, controllerName, onSelectGame, onLaunchGame, onOpenCommandPalette, onNextStore, onPrevStore]);

  return {
    controllerName,
    selectedIndex,
    setSelectedIndex,
  };
}


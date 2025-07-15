"use client";

import DashboardShell from "@/components/layout/DashboardShell";
import Image from "next/image";
import { motion } from "framer-motion";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="relative h-full w-full overflow-hidden px-4 py-8 sm:p-10 lg:p-14 bg-[#fef4f5]">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#fff0f5]/90 via-[#fde2e4]/80 to-[#f9d3e9]/90 transition-all duration-700" />

        {/* Faint logo in background */}
        <div className="absolute inset-0 z-10 flex justify-center items-center pointer-events-none">
          <Image
            src="/images/favicon.png"
            alt="SSP Star Logo"
            width={360}
            height={360}
            priority
            className="select-none opacity-[0.045] blur-[2px] max-w-[60vw] transition duration-700"
          />
        </div>

        {/* Foreground content: Card + Truck side by side */}
        <div className="relative z-20 flex flex-col md:flex-row justify-center items-center h-full gap-8">
          {/* Animated Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="bg-white/40 backdrop-blur-md rounded-xl shadow-md px-6 py-8 max-w-md sm:max-w-xl transition-all duration-500"
          >
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              Welcome to SSP Portal
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              This is your centralized dashboard. Use the sidebar to access your department tools.
              As we grow, this area will evolve into a dynamic hub.
            </p>
          </motion.div>

          {/* Animated Truck */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="hidden md:flex items-center"
          >
            <Image
              src="/images/ssp-truck.png"
              alt="SSP Truck"
              width={500}
              height={440}
              className="object-contain opacity-95 drop-shadow-md"
              priority
            />
          </motion.div>
        </div>
      </div>
    </DashboardShell>
  );
}

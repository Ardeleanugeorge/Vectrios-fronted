"use client"

import Link from "next/link"

interface FeatureGateProps {
  feature: string
  planRequired: string
  children: React.ReactNode
  currentPlan?: string | null
}

export default function FeatureGate({
  feature,
  planRequired,
  children,
  currentPlan
}: FeatureGateProps) {
  return <>{children}</>
}

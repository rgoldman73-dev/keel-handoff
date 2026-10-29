import { createFileRoute } from "@tanstack/react-router";
import { KeelApp } from "@/components/keel/app";

export const Route = createFileRoute("/")({ component: KeelApp });

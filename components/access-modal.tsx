"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

interface AccessModalProps {
  onAccessGranted: () => void;
}

export function AccessModal({ onAccessGranted }: AccessModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const accessCode = process.env.NEXT_PUBLIC_ACCESS_CODE;

    if (code === accessCode) {
      sessionStorage.setItem("access_granted", "true");
      onAccessGranted();
    } else {
      setError("Invalid access code");
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm">
        <div className="flex justify-center">
          <Image
            src={"/idolguessr-logo.png"}
            width={300}
            height={300}
            alt="IdolGuessr Logo"
          />
        </div>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-code">Enter access code</Label>
              <Input
                id="access-code"
                type="text"
                placeholder="Enter 8-digit code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                maxLength={8}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-red-200 p-3">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

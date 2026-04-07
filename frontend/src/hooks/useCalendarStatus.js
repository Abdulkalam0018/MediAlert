import { useCallback, useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance.js";

const INITIAL_STATUS = {
  isConnected: false,
  allowCalendarSync: false,
  lastCalendarSync: null,
  loading: true,
};

export default function useCalendarStatus() {
  const [status, setStatus] = useState(INITIAL_STATUS);

  const refreshCalendarStatus = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/google/status");
      const nextStatus = {
        isConnected: Boolean(response.data?.isConnected),
        allowCalendarSync: Boolean(response.data?.allowCalendarSync),
        lastCalendarSync: response.data?.lastCalendarSync || null,
        loading: false,
      };
      setStatus(nextStatus);
      return nextStatus;
    } catch (error) {
      if (error?.response?.status !== 401 && error?.response?.status !== 404) {
        console.error("Error fetching calendar status:", error);
      }

      const fallbackStatus = {
        ...INITIAL_STATUS,
        loading: false,
      };
      setStatus(fallbackStatus);
      return fallbackStatus;
    }
  }, []);

  useEffect(() => {
    void refreshCalendarStatus();

    const handleCalendarStatusChange = () => {
      void refreshCalendarStatus();
    };

    window.addEventListener(
      "medialert:calendar-status",
      handleCalendarStatusChange
    );

    return () => {
      window.removeEventListener(
        "medialert:calendar-status",
        handleCalendarStatusChange
      );
    };
  }, [refreshCalendarStatus]);

  return {
    ...status,
    isCalendarConnected: status.isConnected && status.allowCalendarSync,
    refreshCalendarStatus,
  };
}

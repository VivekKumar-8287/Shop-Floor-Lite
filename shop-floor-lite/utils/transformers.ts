// Transform backend responses to app format
export const transformMachine = (backendData: any): Machine => {
  return {
    id: backendData._id || backendData.id,
    name: backendData.name,
    type: backendData.type,
    status: backendData.status || 'IDLE',
    // Add other fields as needed
  };
};

export const transformDowntime = (backendData: any): DowntimeEntry => {
  return {
    id: backendData._id || backendData.id,
    machineId: backendData.machineId,
    startTime: backendData.startTime,
    endTime: backendData.endTime,
    reasonCode: backendData.reasonCode,
    subReasonCode: backendData.subReasonCode,
    photoUri: backendData.photoUrl, // Backend might use different field name
    synced: true,
  };
};

export const transformAlert = (backendData: any): Alert => {
  return {
    id: backendData._id || backendData.id,
    title: backendData.title,
    message: backendData.message,
    status: backendData.status,
    acknowledgedBy: backendData.acknowledgedBy,
    acknowledgedAt: backendData.acknowledgedAt,
    createdAt: backendData.createdAt,
  };
};
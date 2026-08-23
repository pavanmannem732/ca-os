import logging
from typing import Dict, List
from fastapi import WebSocket
from uuid import UUID

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # active_connections[firm_id] = [websocket1, websocket2]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, firm_id: str):
        await websocket.accept()
        if firm_id not in self.active_connections:
            self.active_connections[firm_id] = []
        self.active_connections[firm_id].append(websocket)
        logger.info(f"WebSocket connected for firm {firm_id}. Total: {len(self.active_connections[firm_id])}")

    def disconnect(self, websocket: WebSocket, firm_id: str):
        if firm_id in self.active_connections:
            if websocket in self.active_connections[firm_id]:
                self.active_connections[firm_id].remove(websocket)
                if not self.active_connections[firm_id]:
                    del self.active_connections[firm_id]
        logger.info(f"WebSocket disconnected for firm {firm_id}")

    async def broadcast_to_firm(self, firm_id: str, message: dict):
        """Sends a JSON message to all connected clients of a specific firm."""
        if firm_id in self.active_connections:
            for connection in self.active_connections[firm_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to WebSocket: {e}")
                    # In a real app, we'd remove dead connections here

socket_manager = ConnectionManager()

import logging
import httpx
from typing import Optional, Dict, Any, List
from app.core.config import settings
import json

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    async def generate_draft(
        draft_type: str,
        context: Dict[str, Any],
        client_name: str,
        firm_name: str
    ) -> str:
        """
        Generates a professional AI draft based on type and context using Mistral.
        """
        prompt_config = AIService._get_prompt_config(draft_type, context, client_name, firm_name)
        
        if not settings.MISTRAL_API_KEY:
            logger.warning("MISTRAL_API_KEY not set. Returning fallback mock response.")
            return f"[MOCK DRAFT] Professional response for {client_name} regarding {draft_type}."

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.MISTRAL_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"},
                    json={
                        "model": settings.MISTRAL_MODEL,
                        "messages": [
                            {"role": "system", "content": prompt_config["system"]},
                            {"role": "user", "content": prompt_config["user"]}
                        ],
                        "temperature": 0.7
                    },
                    timeout=45.0
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Mistral Generation Error: {str(e)}")
            return f"Error generating draft: {str(e)}"

    @staticmethod
    async def classify_intent(message_text: str) -> Dict[str, Any]:
        """
        Classifies inbound WhatsApp message intent using Mistral.
        """
        system_prompt = """
        You are an intent classifier for an Indian CA firm's WhatsApp bot.
        Classify the user's intent into one of:
        - document_submission: User is sending or promising to send a document.
        - technical_query: User is asking a tax or compliance question.
        - notice_received: User is reporting a government notice.
        - billing_query: User is asking about an invoice or payment.
        - human_request: User explicitly wants to talk to a person.
        - greeting: Simple hi/hello.
        - other: None of the above.

        Output ONLY JSON: {"intent": "...", "confidence": 0.0-1.0, "reason": "..."}
        """
        
        if not settings.MISTRAL_API_KEY:
            return {"intent": "other", "confidence": 0.5, "reason": "No AI API key"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.MISTRAL_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"},
                    json={
                        "model": settings.MISTRAL_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": message_text}
                        ],
                        "temperature": 0
                    },
                    timeout=20.0
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                # Clean JSON if necessary (sometimes LLMs wrap in code blocks)
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
        except Exception as e:
            logger.error(f"Mistral Intent Classification Error: {str(e)}")
            return {"intent": "other", "confidence": 0, "reason": str(e)}

    @staticmethod
    async def analyze_churn_risk(client_data: Dict[str, Any]) -> Dict[str, Any]:
        """Implements SRD Section 33.3 Churn Risk Analysis using Mistral."""
        system_prompt = """
        You are analyzing client engagement data for an Indian CA firm.
        Based on the behavioral signals provided, assess the churn risk for this client.
        Output ONLY JSON: {"churn_risk_score": 1-10, "churn_risk_level": "low/medium/high", "key_risk_factors": [], "recommended_action": ""}
        """
        user_context = f"""
        CLIENT BEHAVIORAL DATA (last 90 days):
        - Average WhatsApp response time: {client_data.get('avg_response_hours')} hours
        - Document requests sent: {client_data.get('doc_requests_sent')}
        - Documents received: {client_data.get('doc_requests_fulfilled')}
        - Invoices: {client_data.get('invoice_count')} issued, {client_data.get('invoice_paid')} paid
        - Compliance health trend: {client_data.get('health_trend')}
        - Last CA interaction: {client_data.get('days_since_last_interaction')} days ago
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.MISTRAL_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"},
                    json={
                        "model": settings.MISTRAL_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_context}
                        ],
                        "temperature": 0
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
        except Exception:
            return {"churn_risk_score": 5, "churn_risk_level": "medium", "key_risk_factors": ["Error in analysis"]}

    @staticmethod
    def _get_prompt_config(draft_type: str, context: Dict[str, Any], client_name: str, firm_name: str) -> Dict[str, str]:
        """Implements prompt library from SRD Section 33 adapted for Mistral."""
        if draft_type == "gst_notice_response":
            system = f"""
            You are a senior Indian Chartered Accountant and tax litigator with 15 years of practice.
            Your task is to draft a formal, professional GST demand notice response letter
            on behalf of a CA firm's client.
            FIRM CONTEXT: CA Firm: {firm_name}, Client: {client_name}.
            """
            user = f"""
            <user_context>
            NOTICE TEXT: {context.get('notice_text')}
            CA NOTES: {context.get('ca_notes', 'None')}
            GROUNDS OF DISPUTE: {context.get('grounds', 'Standard rebuttal')}
            </user_context>
            Draft the complete response letter now.
            """
            return {"system": system, "user": user}
            
        elif draft_type == "client_query":
            system = f"""
            You are a senior CA drafting a WhatsApp/email response to a client query.
            Client: {client_name}, Business: {context.get('client_type', 'Business')}.
            Tone: Professional but conversational. Indian English. Use ₹.
            """
            user = f"""
            <user_context>
            CLIENT QUERY: {context.get('query_text')}
            RECENT STATUS: {context.get('recent_status', 'Regular compliance active')}
            </user_context>
            Draft the response.
            """
            return {"system": system, "user": user}
            
        elif draft_type == "billing_opportunity_detection":
            system = """
            You are reviewing a CA firm's work log for a specific client to identify
            billable work that may not be captured in the current invoice.
            Output ONLY JSON array.
            """
            user = f"""
            <user_context>
            CLIENT: {client_name}
            BILLING PERIOD: {context.get('period_start')} to {context.get('period_end')}
            RETAINER FEE: ₹{context.get('retainer_fee')}/month
            LOGGED WORK: {context.get('logged_work_json')}
            COMPLETED TASKS: {context.get('completed_tasks_json')}
            CONVERSATION SUMMARY: {context.get('conversation_summary')}
            </user_context>
            Identify missed billing opportunities.
            """
            return {"system": system, "user": user}
            
        return {
            "system": "You are a professional CA assistant.",
            "user": f"Draft a professional response for {client_name} regarding {draft_type}. Context: {str(context)}"
        }

ai_service = AIService()

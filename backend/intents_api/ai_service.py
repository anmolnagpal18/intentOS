import json
import os
import google.generativeai as genai
from typing import Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment variables are loaded from root .env explicitly
BASE_DIR = Path(__file__).resolve().parent.parent
root_env = BASE_DIR.parent / '.env'
if root_env.exists():
    load_dotenv(root_env)
else:
    load_dotenv()

class AIService:
    def __init__(self):
        # Instantiate with the API key from environment
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-flash-lite-latest')

    def _check_client(self):
        if not self.model:
            raise ValueError("GEMINI_API_KEY is not set in environment variables.")

    def analyze_intent(self, text: str) -> Dict[str, Any]:
        self._check_client()
        
        prompt = f"""
        You are an intelligent productivity assistant. Analyze the following user goal/intent and extract key parameters.
        Return ONLY a JSON object with the following schema:
        {{
            "category": "string (e.g. Learning, Fitness, Career, Personal)",
            "timeline": "string (e.g. 60 days, 1 year, unspecified)",
            "priority": "string (High, Medium, Low based on tone)",
            "constraints": ["list of strings (e.g. managing gym and college)"],
            "parallel_activities": ["list of strings"]
        }}
        
        User Goal: "{text}"
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3
            )
        )
        
        return json.loads(response.text)

    def generate_workflow(self, intent_data: Dict[str, Any], text: str) -> Dict[str, Any]:
        self._check_client()
        
        prompt = f"""
        You are an intelligent productivity assistant. Based on the user's goal and extracted constraints, generate a structured workflow.
        
        User Goal: "{text}"
        Extracted Info: {json.dumps(intent_data)}
        
        Create a detailed workflow with milestones and specific tasks.
        Return ONLY a JSON object with the following schema:
        {{
            "hierarchy": {{
                "phases": [
                    {{
                        "phase_name": "string",
                        "duration_suggestion": "string",
                        "tasks": [
                            {{"title": "string", "description": "string"}}
                        ]
                    }}
                ]
            }},
            "milestones": ["list of strings"],
            "scheduling_suggestions": {{
                "workload_distribution": "string advice",
                "recovery_days": "string advice",
                "optimal_timings": "string advice"
            }}
        }}
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7
            )
        )
        
        return json.loads(response.text)

    def get_recommendations(self, user_stats: Dict[str, Any]) -> Dict[str, Any]:
        self._check_client()
        
        prompt = f"""
        You are an intelligent productivity assistant. Analyze the user's recent activity stats and provide adaptive suggestions.
        
        User Stats: {json.dumps(user_stats)}
        
        Return ONLY a JSON object with the following schema:
        {{
            "insights": ["list of strings (e.g., 'Your workload is too high this week')"],
            "productivity_advice": ["list of strings"],
            "adaptive_suggestions": ["list of strings"]
        }}
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.5
            )
        )
        
        return json.loads(response.text)

    def generate_task_breakdown(self, task_title: str, intent_description: str) -> list:
        self._check_client()
        
        prompt = f"""
        You are an intelligent productivity assistant. Break down the following high-level task into a detailed list of 3 to 5 micro-steps (subtasks).
        The subtasks should be highly actionable, specific, and clear.
        
        Parent Goal Context: "{intent_description}"
        Task to Break Down: "{task_title}"
        
        Return ONLY a JSON array of objects with the following schema:
        [
            {{"title": "Specific micro-task action step 1", "completed": false}},
            {{"title": "Specific micro-task action step 2", "completed": false}}
        ]
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.4
            )
        )
        
        try:
            return json.loads(response.text)
        except Exception:
            return [
                {"title": "Define requirements & setup context", "completed": False},
                {"title": "Implement core functional steps", "completed": False},
                {"title": "Test & refine outputs", "completed": False}
            ]

    def chat_copilot(self, prompt: str, history: list, json_mode: bool = False) -> str:
        self._check_client()
        
        if json_mode:
            system_context = "You are a precise JSON data compiler. Return ONLY a valid JSON object or array as requested. Do NOT include any markdown formatting, thoughts, explanation, or code fences."
        else:
            system_context = """
        You are an intelligent, empathetic productivity assistant and Goal Co-pilot for Intent-OS.
        Your job is to help users clarify, refine, break down, and structure their personal goals (intents).
        Provide highly actionable advice, scheduling suggestions, and encouragement. Keep your responses concise (no more than 3 paragraphs) and formatted in clean Markdown.
        """
        
        formatted_history = []
        for msg in history:
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            formatted_history.append(f"{role_label}: {msg.get('text')}")
            
        history_text = "\n".join(formatted_history)
        
        full_prompt = f"{system_context}\n\nConversation:\n{history_text}\nUser: {prompt}\nAssistant:"
        
        if json_mode:
            gen_config = genai.GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json"
            )
        else:
            gen_config = genai.GenerationConfig(
                temperature=0.7
            )
        
        response = self.model.generate_content(
            full_prompt,
            generation_config=gen_config
        )
        
        return response.text

    def get_daily_briefing(self, stats: dict) -> str:
        self._check_client()
        
        prompt = f"""
        You are an intelligent, motivating productivity coach for Intent-OS.
        Generate a highly personalized daily briefing (2 to 3 sentences maximum) for the user based on their progress:
        - Total Tasks: {stats.get('total_tasks')}
        - Completed Tasks: {stats.get('completed_tasks')}
        - Pending Tasks: {stats.get('pending_tasks')}
        - Overdue/Missed Tasks: {stats.get('missed_tasks')}
        - Current Active Streak: {stats.get('streak')} days
        
        Provide a quick positive boost, highlight their streak or a warning if they have overdue tasks, and suggest a daily focal point. Keep it short, actionable, and empathetic.
        Do NOT use markdown headers or links. Keep it in plain text.
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.7
            )
        )
        
        return response.text.strip()

    def generate_study_guide(self, task_title: str, intent_title: str) -> str:
        self._check_client()
        
        prompt = f"""
        You are an intelligent, high-end educational tutor and AI Study Guide compiler for Intent-OS.
        Generate a comprehensive, structured Study Guide for the following task inside the goal context:
        - Parent Goal Context: "{intent_title}"
        - Task: "{task_title}"
        
        Please format the study guide beautifully in clean, professional Markdown. Use the following structured sections:
        
        ### 📖 Core Concepts & Summary
        Write a concise, high-density summary (1-2 paragraphs) of the key knowledge, concepts, or tools required to execute this task successfully.
        
        ### 🚀 Step-by-Step Action Plan
        Provide a detailed, bulleted checklist of 3-5 specific actions or learning steps the user should follow.
        
        ### 🧠 Practice Questions / Flashcards
        Provide 2-3 sample practice questions, flashcards, or interview questions related to this topic, along with brief answers or hints.
        
        ### 🔗 Recommended Resources
        Provide 2-3 specific books, websites, documentation links, or keywords they can search for to learn more.
        
        Ensure your tone is motivating, smart, and precise. Do NOT use HTML tags. Keep it fully in standard Markdown.
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.7
            )
        )
        
        return response.text

    def calculate_smart_reschedule(self, tasks: list, current_date_str: str) -> list:
        self._check_client()
        
        prompt = f"""
        You are an intelligent scheduling AI for Intent-OS. The user has several overdue and upcoming tasks.
        Your goal is to reschedule the overdue tasks and potentially balance upcoming tasks starting from {current_date_str} onwards.
        Avoid overloading any single day (maximum 3-4 tasks per day). Lighter workloads are preferred.
        Reschedule tasks realistically, prioritizing overdue tasks first and spreading them out logically.
        
        Tasks list:
        {json.dumps(tasks)}
        
        Return ONLY a JSON array of objects, where each object represents a rescheduled task with its new due date. Keep the date format exactly as YYYY-MM-DD.
        
        Schema:
        [
            {{
                "id": 1,
                "new_due_date": "YYYY-MM-DD",
                "reasoning": "Brief explanation of why this was scheduled here (e.g. 'Spreading out workload to avoid burnout')"
            }}
        ]
        """
        
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.4
            )
        )
        
        return json.loads(response.text)

ai_service = AIService()

from typing import Dict, Any, List

class TemplateLibrary:
    """
    Biblioteca de opções de templates do PREZZY.
    Serve como:
    1. Fonte de dados para a UI de seleção do usuário.
    2. Dicionário de design pattern para a IA (contexto).
    3. Registro de configuração para a Engine Híbrida de Renderização (WeasyPrint vs CloudConvert).
    """

    REGISTRY: Dict[str, Dict[str, Any]] = {
        "template_corporate_light": {
            "name": "Corporate Light",
            "description": "Design limpo e corporativo. Foco em legibilidade e profissionalismo.",
            "thumbnail_url": "/thumbnails/corporate_light.png",  # Exemplo visual futuro
            "design_pattern": "Minimalista, fundo claro, tipografia sans-serif estruturada. Ideal para relatórios e pitches B2B diretos.",
            "render_config": {
                "requires_js": False,
                "complex_layout": False,
                "engine_preference": "weasyprint"
            }
        },
        "template_infoproduct_dark": {
            "name": "Infoproduct Dark",
            "description": "Visual agressivo e escuro. Focado em alta conversão e impacto visual.",
            "thumbnail_url": "/thumbnails/infoproduct_dark.png",
            "design_pattern": "Dark mode, alto contraste, fontes grandes e arrojadas. Ideal para cursos, infoprodutos e lançamentos digitais.",
            "render_config": {
                "requires_js": False,
                "complex_layout": False,
                "engine_preference": "weasyprint"
            }
        },
        "template_dynamic_glass": {
            "name": "Dynamic Glassmorphism",
            "description": "Estética premium com efeitos de desfoque (glassmorphism) e fundos fluidos.",
            "thumbnail_url": "/thumbnails/dynamic_glass.png",
            "design_pattern": "Moderno, translúcido (backdrop-filter), formas orgânicas no fundo. Exige renderização avançada de CSS.",
            "render_config": {
                "requires_js": False,
                "complex_layout": True,
                "engine_preference": "cloudconvert"
            }
        },
        "template_dynamic_brutalist": {
            "name": "Brutalist Impact",
            "description": "Design brutalista, fontes gigantes, formas duras e cores vibrantes.",
            "thumbnail_url": "/thumbnails/dynamic_brutalist.png",
            "design_pattern": "Neo-brutalismo, bordas grossas, grids assimétricos e alto impacto. Desafiador para motores PDF básicos.",
            "render_config": {
                "requires_js": False,
                "complex_layout": True,
                "engine_preference": "cloudconvert"
            }
        },
        "template_dynamic_elegant": {
            "name": "Elegant Serif",
            "description": "Luxo e sofisticação. Focado em marcas premium e moda.",
            "thumbnail_url": "/thumbnails/dynamic_elegant.png",
            "design_pattern": "Fontes serifadas, grandes espaços em branco, estética editorial de revista de luxo.",
            "render_config": {
                "requires_js": False,
                "complex_layout": False,
                "engine_preference": "weasyprint"
            }
        }
    }

    @classmethod
    def get_template(cls, template_id: str) -> Dict[str, Any]:
        """Retorna as configurações de um template específico, ou um default se não existir."""
        # Remove a extensão .html se enviada acidentalmente
        base_id = template_id.replace(".html", "")
        return cls.REGISTRY.get(base_id, cls.REGISTRY["template_corporate_light"])

    @classmethod
    def get_all_for_ui(cls) -> List[Dict[str, str]]:
        """Retorna uma lista otimizada para o frontend renderizar as opções."""
        return [
            {
                "id": t_id,
                "name": t_data["name"],
                "description": t_data["description"],
                "thumbnail_url": t_data["thumbnail_url"]
            }
            for t_id, t_data in cls.REGISTRY.items()
        ]
    
    @classmethod
    def get_ai_context(cls) -> str:
        """Gera um prompt de contexto para o Agente IA entender quais templates existem."""
        context = "Catálogo de Templates de Design Disponíveis no PREZZY:\n"
        for t_id, t_data in cls.REGISTRY.items():
            context += f"- ID: {t_id} | Nome: {t_data['name']} | Padrão: {t_data['design_pattern']}\n"
        return context

#!/usr/bin/env python3
"""
Teste rápido de ZeroMQ - Verifica se instalação está OK
"""
import sys

print("🔍 Testando ZeroMQ...")

try:
    import zmq
    print("✅ pyzmq instalado com sucesso!")
    print(f"   Versão: {zmq.zmq_version()}")
except ImportError:
    print("❌ pyzmq NÃO está instalado!")
    print("\n💡 Para instalar:")
    print("   pip install pyzmq")
    sys.exit(1)

# Teste de socket
try:
    context = zmq.Context()
    socket = context.socket(zmq.REP)
    socket.bind("tcp://*:5556")  # Porta diferente para não conflitar
    print("✅ Socket ZeroMQ criado com sucesso!")
    socket.close()
    context.term()
except Exception as e:
    print(f"❌ Erro ao criar socket: {e}")
    sys.exit(1)

print("\n🎉 ZeroMQ está funcionando perfeitamente!")
print("   Você pode iniciar o bot agora: python forex_bot.py")

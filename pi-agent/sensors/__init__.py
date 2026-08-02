"""Sensor drivers for the Verdant Pi agent.

Every driver is lazy: it only imports its hardware library when enabled, so the
agent runs on a Pi with only some of the sensors attached (and on a laptop with
none of them, for testing).
"""

#!/usr/bin/env python3
from aws_cdk import App
from stacks.foundation import FoundationStack

app = App()
FoundationStack(app, "FoundationStack")
app.synth()
